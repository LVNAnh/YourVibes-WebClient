import { UpdateProfileRequestModel } from '@/api/features/profile/model/UpdateProfileModel';
import { defaultProfileRepo, ProfileRepo } from '@/api/features/profile/ProfileRepository';
import { useAuth } from '@/context/auth/useAuth';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react'



const UpdateProfileViewModel = (repo: ProfileRepo) => {
  const [loading, setLoading] = useState(false);
  const { localStrings, onUpdateProfile } = useAuth();
  const router = useRouter();
  const [objectPosition, setObjectPosition] = useState("center");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  //update Profile
const updateProfile = async (data: UpdateProfileRequestModel) => {
  try {
    setLoading(true);
    const response = await defaultProfileRepo.updateProfile(data); 
    
    if (!response?.error) {
      onUpdateProfile(response?.data);
      message.success(localStrings.UpdateProfile.UpdateSuccess);
      router.push("/profile?tab=info");

      localStorage.setItem("capwallPosition", objectPosition);

    } else { 
      
      message.error(localStrings.UpdateProfile.UpdateFailed);
      setLoading(false);
    }
  } catch (error: any) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

const handleScroll = () => {
  const container = scrollContainerRef.current;
  if (container) {
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const positionValue = `${Math.min(Math.max(scrollPercent * 100, 0), 100)}%`;
    setObjectPosition(`center ${positionValue}`);
  }
};


  return {
    loading,
    updateProfile,
    handleScroll,
    scrollContainerRef,
    objectPosition,
    setObjectPosition
    
  };
};

export default UpdateProfileViewModel;