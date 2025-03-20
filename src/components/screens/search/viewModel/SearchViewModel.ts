import { UserModel } from "@/api/features/authenticate/model/LoginModel";
import { SearchRepo } from "@/api/features/search/SearchRepository";
import { useAuth } from "@/context/auth/useAuth";
import { useState } from "react";


const SearchViewModel = (repo: SearchRepo) => {
  const { localStrings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;
  const [hasMore, setHasMore] = useState(false);

  const resetSearchResult = () => {
    setUsers([]);
    setTotal(0);
    setPage(1);
    setHasMore(true);
  }

  const searchUsers = async (keyword: string, newPage: number = 1) => {
    try {
      setLoading(true)
      if (!keyword) {
        resetSearchResult();
        return
      }
      const res = await repo.search({
        name: keyword,
        page: newPage,
        limit: limit
      });
      if (!res?.error) {
        if (newPage === 1) {
          setUsers(res?.data);
        } else {
          setUsers((prevUsers) => [...prevUsers, ...res?.data]);
        }
        const { page: currentPage, limit: currentLimit, total: totalRecords } = res?.paging;
        setTotal(totalRecords);
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      } else {
        // Toast.show({
        //   type: 'error',
        //   text1: localStrings.Search.SearchFailed,
        //   text2: res?.error?.message
        // })
        
        resetSearchResult();
      }
    } catch (error: any) {
      console.error(error);
    //   Toast.show({
    //     type: 'error',
    //     text1: localStrings.Search.SearchFailed,
    //     text2: error?.error?.message
    //   })
    } finally {
      setLoading(false)
    }
  }

  const loadMoreUsers = (keyword: string) => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
      searchUsers(keyword,page + 1);
    }
  };

  return {
    searchUsers,
    loadMoreUsers,
    loading,
    users,
    total
  }
}

export default SearchViewModel