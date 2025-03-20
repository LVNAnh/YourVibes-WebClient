"use client"
import UserProfileScreen from '@/components/screens/profile/views/UserProfileScreen';
import { useRouter } from 'next/router'
import React from 'react'

const page = ({ params }: { params: { id: string } }) => {
  const id = params.id;

  const getUserId = () => {
    if (Array.isArray(id)) {
      return id[0];
    } else {
      return id || '';
    }
  };

  if (!id) {
    return <div className="text-center text-gray-500">Đang tải...</div>;
  }

  return (
    <UserProfileScreen id={getUserId()} />
  );
};


export default page

