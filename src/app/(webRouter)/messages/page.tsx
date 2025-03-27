"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Skeleton } from "antd";
import dynamic from 'next/dynamic';

const DynamicMessagesFeature = dynamic(
  () => import('@/components/screens/messages/view/MessagesFeature'),
  { 
    loading: () => <Skeleton paragraph={{ rows: 10 }} active />,
    ssr: false 
  }
);

export default function MessagesPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <Skeleton paragraph={{ rows: 10 }} active />;
  }

  return (
    <div className="h-full">
      <Suspense fallback={<Skeleton paragraph={{ rows: 10 }} active />}>
        <DynamicMessagesFeature />
      </Suspense>
    </div>
  );
}