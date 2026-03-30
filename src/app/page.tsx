
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatLayout from "@/components/chat/chat-layout";
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { updateLastLoginAction } from '@/app/actions/users';

function AppSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}


export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const lastLoginUpdated = useRef(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && !lastLoginUpdated.current) {
      lastLoginUpdated.current = true;
      updateLastLoginAction(user.uid).catch(console.error);
    }
  }, [user]);

  if (isUserLoading || !user) {
    return <AppSkeleton />;
  }

  return (
    <ChatLayout />
  );
}
