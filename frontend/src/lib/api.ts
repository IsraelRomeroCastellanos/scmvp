// src/lib/api.ts
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // En el navegador
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://plataforma-cumplimiento-mvp.onrender.com';
  }
  // En el servidor
  return process.env.BACKEND_URL || 'https://plataforma-cumplimiento-mvp.onrender.com';
};

export const api = {
  get: async (endpoint: string, token?: string) => {
    const url = `${getBackendUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Error ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    return response.json();
  },
  
  post: async (endpoint: string, data: any, token?: string) => {
    const url = `${getBackendUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Error ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    return response.json();
  },
  
  put: async (endpoint: string, data: any, token?: string) => {
    const url = `${getBackendUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Error ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    return response.json();
  }
};