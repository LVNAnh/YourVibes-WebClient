"use client";

import { useSearchParams } from 'next/navigation';
import PostDetailsScreen from '@/components/screens/postDetails/view/postDetailsScreen';
import { Suspense } from 'react';

const Content = () => {
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId');

  if (!postId) {
    return <div className="text-center text-gray-500">Đang tải...</div>;
  } else {
    return <PostDetailsScreen postId={postId} isModal={false} />;
  }
}

const PostDetailsPage = () => {
  return (
    <Content />
  )
};

export default PostDetailsPage;