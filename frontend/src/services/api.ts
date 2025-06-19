import axios from 'axios';
import type { ChatResponse } from '../types/chat';
import type { DatasetInfo } from '../types/dataset';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendMessage = async (payload: { message: string; history?: any[] } | string): Promise<ChatResponse> => {
  try {
    if (typeof payload === 'string') {
      const response = await api.post<ChatResponse>('/chat', { message: payload });
      return response.data;
    } else {
      const response = await api.post<ChatResponse>('/chat', payload);
      return response.data;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const uploadDataset = async (file: File): Promise<DatasetInfo> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<DatasetInfo>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading dataset:', error);
    throw error;
  }
};

export const getCurrentDataset = async (): Promise<DatasetInfo> => {
  try {
    const response = await api.get<DatasetInfo>('/dataset');
    return response.data;
  } catch (error) {
    console.error('Error getting dataset:', error);
    throw error;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('Error checking health:', error);
    return false;
  }
};

export const resetDatabase = async (): Promise<void> => {
  try {
    await api.post('/reset');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}; 