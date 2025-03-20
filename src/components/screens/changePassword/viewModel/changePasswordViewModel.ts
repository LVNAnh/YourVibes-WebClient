import { ChangePasswordRequestModel } from "@/api/features/profile/model/ChangPasswordModel";
import { ProfileRepo } from "@/api/features/profile/ProfileRepository";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { useState } from "react";


const ChangePasswordViewModel = (repo : ProfileRepo) => {
        const [loading, setLoading] = useState(false);
        const [oldPassword, setOldPassword] = useState('');
        const [newPassword, setNewPassword] = useState('');
        const [conformPassword, setConformPassword] = useState('');
        const [showChangePassword, setShowChangePassword] = useState(false);
        const {localStrings} = useAuth();
        
        const changePassword = async (data: ChangePasswordRequestModel) => {
            try {
              setLoading(true);
              const res = await repo.changePassword(data);
              if (!res?.error) { 
                message.success(`${localStrings.ChangePassword.ChangePasswordSuccess}`);
                
              } else { 
                message.error(`${localStrings.ChangePassword.ChangePasswordFailed}`);
              }
              return res;
            }catch (error: any) {
              console.error(error);
                message.error(`${localStrings.ChangePassword.ChangePasswordFailed}`);
            }finally {
              setLoading(false);
            }
          };
  return {
    loading,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    conformPassword,
    setConformPassword,
    changePassword,
    showChangePassword,
    setShowChangePassword
  };
};

export default ChangePasswordViewModel;