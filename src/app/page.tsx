"use client";
import { useAuth } from '@/context/auth/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/home');  
    } else {
      router.push('/login');  
    }
  }, [isAuthenticated, router]);  

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-white">
      <img 
        src="/image/yourvibes_black.png" 
        alt="YourVibes" 
      />
    </div>
  );
};

export default Page;