import React, { useState } from 'react';
import { Button, Typography, Row, Col, Radio, Space } from 'antd';
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import UpdateProfileViewModel from '../../updateProfile/viewModel/UpdateProfileViewModel';
import { useAuth } from '@/context/auth/useAuth';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { Privacy } from '@/api/baseApiResponseModel/baseApiResponseModel';


const ObjectProfile = ({ closedModalObject }: { closedModalObject: () => void }) => {
  const { user, localStrings } = useAuth();
  const [selectedOption, setSelectedOption] = useState(user?.privacy);
  const { loading, updateProfile } = UpdateProfileViewModel(defaultProfileRepo);

  const router = useRouter();

  const handleSelect = (option: Privacy) => {
    setSelectedOption(option);
   
  };

  const handleSavePrivacy = () => {
    updateProfile({ privacy: selectedOption });
    closedModalObject();
  };

  const options = [
    { label: localStrings.Public.Public, icon: 'globe', description: localStrings.ObjectPostPrivacy.PublicDescription, value: Privacy.PUBLIC },
    { label: localStrings.Public.Friend, icon: 'people', description: localStrings.ObjectPostPrivacy.FriendDescription, value: Privacy.FRIEND_ONLY },
    { label: localStrings.Public.Private, icon: 'lock-closed', description: localStrings.ObjectPostPrivacy.PrivateDescription, value: Privacy.PRIVATE },
  ];


  return (
    <div>
      {/* Content */}
      <div className="px-4 py-4">
        <Typography.Text strong className="text-lg">
          {localStrings.ObjectProfile.Contents.WhoCanSee}
        </Typography.Text>
        <p className="mt-2 mb-4">
          {localStrings.ObjectPostPrivacy.Contents.DefaultPrivacy1}
          <span className="font-semibold">{localStrings.Public.Public}</span>
          {localStrings.ObjectProfile.Contents.DefaultPrivacy2}
        </p>

        <Typography.Text strong className="text-lg">
          {localStrings.ObjectPostPrivacy.ChoosePrivacy}
        </Typography.Text>

        <div className="mt-2">
          {options.map((option) => (
            <Row key={option.label} align="middle" className="my-2">
              <Col xs={3} sm={2}>
                <Radio
                  checked={selectedOption === option.value}
                  onChange={() => handleSelect(option.value)}
                  className="mr-4"
                />
              </Col>
              <Col xs={21} sm={22}>
                <div className="flex flex-col">
                  <Typography.Text>{option.label}</Typography.Text>
                  <Typography.Text className="text-gray-500 text-sm">{option.description}</Typography.Text>
                </div>
              </Col>
            </Row>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4">
        <Button
          type="primary"
          block
          loading={loading}
          onClick={handleSavePrivacy}
          className="rounded-full"
        >
          {localStrings.Public.Save}
        </Button>
      </div>
    </div>
  );
};

export default ObjectProfile;