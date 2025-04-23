import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SearchViewModel from "../viewModel/SearchViewModel";
import { defaultSearchRepo } from "@/api/features/search/SearchRepository";
import { AutoComplete, AutoCompleteProps, Input, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { UserModel } from "@/api/features/authenticate/model/LoginModel";

const { Text } = Typography;

interface SearchScreenProps {
  onSearchResults?: (users: UserModel[], total: number, currentPage?: number) => void;
}

const SearchScreen = React.memo(({ onSearchResults }: SearchScreenProps) => {
  const [options, setOptions] = useState<AutoCompleteProps["options"]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const { searchUsers, users, loading, total } = SearchViewModel(defaultSearchRepo);
  const { brandPrimary, backgroundColor } = useColor();
  const { localStrings } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onSearchResults && users) {
      onSearchResults(users, total);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (keyword) {
        await searchUsers(keyword);
      } else {
        setOptions([]);
        if (onSearchResults) {
          onSearchResults([], 0, 1);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (Array.isArray(users)) {
      setOptions(users.map((user) => ({ value: user.name })));
    }
  }, [users]);

  const handleSelect = (userId: string) => {
    router.push(`/user/${userId}`);
    setKeyword("");
    setOptions([]);
  };

  const renderFooter = useCallback(() => {
    return loading ? (
      <div style={{ textAlign: "center", padding: "10px" }}>
        <Spin />
      </div>
    ) : null;
  }, [loading]);

  const renderDropdown = () => {
    const inputRect = inputRef.current?.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;

    const dropdownStyle: React.CSSProperties = {
      position: "fixed",
      top: inputRect ? inputRect.bottom + window.scrollY + 4 : "auto",
      left: isMobile ? 16 : inputRect ? inputRect.left + window.scrollX : "auto",
      right: isMobile ? 16 : "auto",
      width: isMobile ? "calc(100% - 32px)" : inputRect ? inputRect.width : "280px",
      maxHeight: isMobile ? "300px" : "400px",
      overflowY: "auto",
      backgroundColor,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      borderRadius: "8px",
      zIndex: 1000,
    };

    if (users?.length > 0) {
      return (
        <div style={dropdownStyle}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: isMobile ? "8px" : "10px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
              }}
              onClick={() => user?.id && handleSelect(user.id)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  loading="lazy"
                  style={{
                    width: isMobile ? 40 : 50,
                    height: isMobile ? 40 : 50,
                    borderRadius: "50%",
                  }}
                />
                <Text
                  style={{
                    marginLeft: isMobile ? 8 : 10,
                    fontWeight: "bold",
                    fontSize: isMobile ? 14 : 16,
                  }}
                >
                  {user.family_name + " " + user.name}
                </Text>
              </div>
            </div>
          ))}
          {renderFooter()}
        </div>
      );
    } else {
      return (
        <div style={dropdownStyle}>
          <div style={{ textAlign: "center", padding: isMobile ? 10 : 20 }}>
            <img
              src="https://res.cloudinary.com/dkf51e57t/image/upload/v1729847545/Search-rafiki_uuq8tx.png"
              alt="No results"
              loading="lazy"
              style={{
                width: "100%",
                maxWidth: isMobile ? 200 : 280,
                marginBottom: isMobile ? 10 : 20,
              }}
            />
            <Text style={{ color: "gray", fontSize: isMobile ? 14 : 16 }}>
              {keyword ? localStrings.Search.NoUsers : localStrings.Search.TrySearch}
            </Text>
          </div>
        </div>
      );
    }
  };

  return (
    <div
      ref={inputRef}
      style={{
        width: "100%",
        maxWidth: "600px",
        minWidth: "280px",
        position: "relative",
      }}
    >
      <AutoComplete
        options={options}
        onSearch={(value) => setKeyword(value)}
        value={keyword}
        size="large"
        dropdownRender={renderDropdown}
        className="w-full"
        style={{ width: "100%" }}
        popupMatchSelectWidth={false}
      >
        <Input
          placeholder={localStrings.Search.Search}
          aria-label={localStrings.Search.Search}
        />
      </AutoComplete>
    </div>
  );
});

export default SearchScreen;