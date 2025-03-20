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
      router.push('/home'); // Điều hướng đến trang chính nếu đã đăng nhập
    } else {
      router.push('/login'); // Điều hướng đến trang login nếu chưa đăng nhập
    }
  }, [isAuthenticated, router]); // Chỉ chạy khi trạng thái xác thực hoặc router thay đổi

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