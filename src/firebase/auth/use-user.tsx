
'use client';

import { useMemo } from 'react';
import { useFirebase, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { User as AuthUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';

export type UserRole = 'admin' | 'operator';

// Define the shape of the user profile data from Firestore
export interface UserProfile {
  name: string;
  role: UserRole;
  lastLogin: any; // Can be Firebase Timestamp
  email?: string;
  uid: string;
  operatorId?: string;
  instanceId?: string[];
  color?: string;
}

// Combine AuthUser and our UserProfile
export type UserData = AuthUser & Partial<UserProfile>;

interface UseUserResult {
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook to get the current Firebase user, enriched with data from Firestore.
 * @returns {UseUserResult} The user data, loading state, and error.
 */
export const useUser = (): UseUserResult => {
  const { user: authUser, isUserLoading: isAuthLoading, userError: authError } = useFirebase();
  const firestore = useFirestore();

  // Create a memoized document reference
  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );

  // Fetch the user profile document from Firestore
  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<UserProfile>(userDocRef);

  // Memoize the combined user data
  const user = useMemo<UserData | null>(() => {
    if (!authUser) return null;

    // Return a combined object: auth data is the base, profile data overwrites/adds to it.
    return {
      ...authUser,
      email: authUser.email ?? null, // Mantieni null come Firebase
      displayName: authUser.displayName ?? null, // Mantieni null come Firebase
      ...userProfile,
    } as UserData;
  }, [authUser, userProfile]);

  const isUserLoading = isAuthLoading || isProfileLoading;
  const userError = authError || profileError;

  return {
    user,
    isUserLoading,
    userError,
  };
};
