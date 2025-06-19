import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useApi<T>(endpoint: string, options?: ApiOptions): ApiState<T> & {
  refetch: () => void;
  mutate: (data: any) => Promise<T>;
} {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const { user } = useAuth();

  const makeRequest = async (customOptions?: ApiOptions): Promise<T> => {
    const requestOptions: RequestInit = {
      method: customOptions?.method || options?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        ...options?.headers,
        ...customOptions?.headers,
      },
    };

    if (customOptions?.body || options?.body) {
      requestOptions.body = JSON.stringify(customOptions?.body || options?.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await makeRequest();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: (error as Error).message });
    }
  };

  const mutate = async (data: any): Promise<T> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await makeRequest({ ...options, body: data });
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: (error as Error).message }));
      throw error;
    }
  };

  useEffect(() => {
    if (options?.method === 'GET' || !options?.method) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, options?.method]);

  return {
    ...state,
    refetch: fetchData,
    mutate,
  };
}

export function useApiMutation<T>(endpoint: string, options?: Omit<ApiOptions, 'method'>) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { user } = useAuth();

  const mutate = async (data: any, method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST'): Promise<T> => {
    try {
      setState({ data: null, loading: true, error: null });
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          ...options?.headers,
        },
        body: JSON.stringify(data),
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      setState({ data: null, loading: false, error: (error as Error).message });
      throw error;
    }
  };

  return {
    ...state,
    mutate,
  };
} 