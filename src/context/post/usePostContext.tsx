"use client"
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { PostContextType } from './postContextType';
import { Privacy } from '@/api/baseApiResponseModel/baseApiResponseModel';

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedPostContent, setSavedPostContent] = useState<string | undefined>('');
  const [savedSelectedImageFiles, setSavedSelectedImageFiles] = useState<any[] | undefined>([]);
  const [savedPrivacy, setSavedPrivacy] = useState<Privacy | undefined>(Privacy.PUBLIC);

  const clearSavedPost = () => {
    setSavedPostContent('');
    setSavedSelectedImageFiles([]);
    setSavedPrivacy(Privacy.PUBLIC);
  }

  return (
    <PostContext.Provider value={{
      savedPostContent,
      setSavedPostContent,
      savedSelectedImageFiles,
      setSavedSelectedImageFiles,
      savedPrivacy,
      setSavedPrivacy,
      clearSavedPost
    }}>
      {children}
    </PostContext.Provider>
  )
}

export const usePostContext = (): PostContextType => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePostContext must be used within an PostProvider');
  }
  return context;
};

