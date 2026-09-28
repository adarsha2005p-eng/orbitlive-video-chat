import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest, generateToken } from '../middleware/auth.middleware';
import { UserPayload, UserProfile } from '../types';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(25).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores'),
  password: z.string().min(6).max(100),
  displayName: z.string().min(1).max(30).optional(),
  country: z.string().max(50).optional(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const profileSchema = z.object({
  displayName: z.string().min(1).max(30).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional().nullable(),
  country: z.string().max(50).optional(),
  preferredLanguage: z.string().max(50).optional(),
  interests: z.array(z.string()).max(10).optional(),
  bio: z.string().max(200).optional().nullable(),
});

// Fallback in-memory database store for dev if Postgres is not yet provisioned
interface LocalUser {
  id: string;
  username: string;
  passwordHash?: string;
  isGuest: boolean;
  profile: UserProfile;
}
const localUsers = new Map<string, LocalUser>();

// Pre-populate demo user or generator
function createDefaultProfile(userId: string, username: string, displayName?: string, country?: string): UserProfile {
  return {
    id: uuidv4(),
    userId,
    displayName: displayName || username,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    country: country || 'Worldwide',
    preferredLanguage: 'English',
    interests: ['Tech', 'Music', 'Travel'],
    bio: 'Ready to meet people from around the world!',
  };
}

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response) {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.errors[0].message });
    }

    const { username, password, displayName, country } = parse.data;
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user exists
    if (prisma) {
      try {
        const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
        if (existing) {
          return res.status(409).json({ error: 'Username is already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: {
            username: normalizedUsername,
            passwordHash,
            isGuest: false,
            profile: {
              create: {
                displayName: displayName || username,
                country: country || 'Worldwide',
                preferredLanguage: 'English',
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`,
                interests: ['Tech', 'Gaming', 'Music'],
              },
            },
          },
          include: { profile: true },
        });

        const tokenPayload: UserPayload = {
          id: user.id,
          username: user.username,
          isGuest: false,
        };

        const token = generateToken(tokenPayload);
        res.cookie('token', token, COOKIE_OPTIONS);

        return res.status(201).json({
          user: tokenPayload,
          profile: user.profile,
          token,
        });
      } catch (dbErr) {
        // Fall back to local memory if Prisma table isn't created yet
      }
    }

    // Local fallback
    if (localUsers.has(normalizedUsername)) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const profile = createDefaultProfile(userId, normalizedUsername, displayName, country);
    const localUser: LocalUser = {
      id: userId,
      username: normalizedUsername,
      passwordHash,
      isGuest: false,
      profile,
    };
    localUsers.set(normalizedUsername, localUser);

    const tokenPayload: UserPayload = { id: userId, username: normalizedUsername, isGuest: false };
    const token = generateToken(tokenPayload);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({ user: tokenPayload, profile, token });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { username, password } = parse.data;
    const normalizedUsername = username.toLowerCase().trim();

    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { username: normalizedUsername },
          include: { profile: true },
        });

        if (user && user.passwordHash) {
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (isMatch) {
            const tokenPayload: UserPayload = {
              id: user.id,
              username: user.username,
              isGuest: user.isGuest,
            };
            const token = generateToken(tokenPayload);
            res.cookie('token', token, COOKIE_OPTIONS);
            return res.json({ user: tokenPayload, profile: user.profile, token });
          }
        }
      } catch (dbErr) {
        // Fall through to memory
      }
    }

    const localUser = localUsers.get(normalizedUsername);
    if (!localUser || !localUser.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, localUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const tokenPayload: UserPayload = {
      id: localUser.id,
      username: localUser.username,
      isGuest: false,
    };
    const token = generateToken(tokenPayload);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({ user: tokenPayload, profile: localUser.profile, token });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function guestLogin(req: Request, res: Response) {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `guest_${randomSuffix}`;
    const userId = uuidv4();
    const displayName = `Stranger #${randomSuffix}`;

    if (prisma) {
      try {
        const user = await prisma.user.create({
          data: {
            id: userId,
            username: guestUsername,
            isGuest: true,
            profile: {
              create: {
                displayName,
                country: 'Worldwide',
                preferredLanguage: 'English',
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestUsername}`,
                interests: ['Random Chat', 'Friends'],
              },
            },
          },
          include: { profile: true },
        });

        const tokenPayload: UserPayload = { id: user.id, username: user.username, isGuest: true };
        const token = generateToken(tokenPayload);
        res.cookie('token', token, COOKIE_OPTIONS);

        return res.json({ user: tokenPayload, profile: user.profile, token });
      } catch {
        // Fallback to local
      }
    }

    const profile = createDefaultProfile(userId, guestUsername, displayName);
    const localUser: LocalUser = {
      id: userId,
      username: guestUsername,
      isGuest: true,
      profile,
    };
    localUsers.set(guestUsername, localUser);

    const tokenPayload: UserPayload = { id: userId, username: guestUsername, isGuest: true };
    const token = generateToken(tokenPayload);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({ user: tokenPayload, profile, token });
  } catch (err) {
    console.error('[Guest Login Error]:', err);
    return res.status(500).json({ error: 'Guest login failed' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, username } = req.user;

  if (prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      });
      if (user) {
        return res.json({
          user: { id: user.id, username: user.username, isGuest: user.isGuest },
          profile: user.profile,
        });
      }
    } catch {
      // Fallback
    }
  }

  // Check local store
  const localUser = localUsers.get(username);
  if (localUser) {
    return res.json({
      user: { id: localUser.id, username: localUser.username, isGuest: localUser.isGuest },
      profile: localUser.profile,
    });
  }

  // Default fallback if session exists
  const fallbackProfile = createDefaultProfile(id, username);
  return res.json({
    user: req.user,
    profile: fallbackProfile,
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0].message });
  }

  const { displayName, avatarUrl, country, preferredLanguage, interests, bio } = parse.data;

  if (prisma) {
    try {
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: req.user.id },
        update: {
          ...(displayName && { displayName }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(country && { country }),
          ...(preferredLanguage && { preferredLanguage }),
          ...(interests && { interests }),
          ...(bio !== undefined && { bio }),
        },
        create: {
          userId: req.user.id,
          displayName: displayName || req.user.username,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.user.username}`,
          country: country || 'Worldwide',
          preferredLanguage: preferredLanguage || 'English',
          interests: interests || [],
          bio: bio || '',
        },
      });

      return res.json({ profile: updatedProfile });
    } catch {
      // Fallback
    }
  }

  // Update in local store
  const localUser = localUsers.get(req.user.username);
  if (localUser) {
    localUser.profile = {
      ...localUser.profile,
      ...(displayName && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(country && { country }),
      ...(preferredLanguage && { preferredLanguage }),
      ...(interests && { interests }),
      ...(bio !== undefined && { bio }),
    };
    return res.json({ profile: localUser.profile });
  }

  return res.json({
    profile: {
      id: uuidv4(),
      userId: req.user.id,
      displayName: displayName || req.user.username,
      avatarUrl,
      country: country || 'Worldwide',
      preferredLanguage: preferredLanguage || 'English',
      interests: interests || [],
      bio: bio || '',
    },
  });
}

export function logout(req: Request, res: Response) {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
}
