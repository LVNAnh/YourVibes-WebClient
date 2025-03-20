import { useAuth } from '@/context/auth/useAuth';
import useColor from '@/hooks/useColor';
import React, { useState, useCallback, useEffect } from 'react';
import SearchViewModel from '../viewModel/SearchViewModel';
import { defaultSearchRepo } from '@/api/features/search/SearchRepository';
import { AutoComplete, Input, Spin, AutoCompleteProps, Typography } from 'antd';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

import { useRef } from 'react';

const SearchScreen = React.memo(() => {
  const [options, setOptions] = useState<AutoCompleteProps['options']>([]);
  const [keyword, setKeyword] = useState<string>('');
  const { searchUsers, users, loading } = SearchViewModel(defaultSearchRepo);
  const { brandPrimary, backgroundColor } = useColor();
  const { localStrings } = useAuth();
  const router = useRouter();

  const usersRef = useRef(users);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (keyword) {
        await searchUsers(keyword);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]); 


  useEffect(() => {
    if (Array.isArray(users) && users !== usersRef.current) {
      setOptions(users.map((user) => ({ value: user.name }))); 
      usersRef.current = users; 
    }
  }, [users]);

    // Xử lý sự kiện khi click vào kết quả
    const handleSelect = (userId: string) => {
      router.push(`/user/${userId}`); // Chuyển hướng đến trang user
      setKeyword(''); // Reset keyword
      setOptions([]); // Đặt lại options để đóng dropdown
    };
  

  const renderFooter = useCallback(() => {
    return loading ? (
      <div style={{ textAlign: 'center', padding: '10px' }}>
        <Spin />
      </div>
    ) : null;
  }, [loading]);

  const renderDropdown = () => {
    if (users?.length > 0) {
      return (
        <div style={{  position: 'fixed', 
          top: '60px', 
          width: '280px',
          maxHeight: '400px', 
          overflowY: 'auto', 
          backgroundColor,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
          borderRadius: '8px', 
          zIndex: 1000, }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 10,
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
              }}
              onClick={() => user?.id && handleSelect(user.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{ width: 50, height: 50, borderRadius: '50%' }}
                />
                <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 16 }}>
                  {user.family_name + ' ' + user.name}
                </Text>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <img
            src="https://res.cloudinary.com/dkf51e57t/image/upload/v1729847545/Search-rafiki_uuq8tx.png"
            alt="No results"
            style={{ width: '100%', maxWidth: 280, marginBottom: 20 }}
          />
          <Text style={{ color: 'gray', fontSize: 16 }}>
            {keyword ? localStrings.Search.NoUsers : localStrings.Search.TrySearch}
          </Text>
        </div>
      );
    }
  };
  

  return (
    <AutoComplete
      popupMatchSelectWidth={252}
      options={options}
      onSearch={(value) => setKeyword(value)} 
      value={keyword}
      size="large"
      dropdownRender={renderDropdown} 
      className='md:w-80'
    >
      <Input
        placeholder={localStrings.Search.Search}
      />
    </AutoComplete>
  );
});

export default SearchScreen;
