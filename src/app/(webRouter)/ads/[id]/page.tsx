"use client"
import AdsScreen from '@/components/screens/ads/views/Ads';
import React from 'react'

const page = ({ params }: { params: { id: string } }) => {
  const id = params.id;

  const getPostId = () => {
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
    <AdsScreen postId={getPostId()} />
  );
};


export default page

