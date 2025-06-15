import type { ReactElement } from 'react';

export interface Message {
  id: string;
  content: string | ReactElement;
  role: 'user' | 'assistant';
  timestamp: Date;
  explanation?: string;
  summary?: string;
  query?: string;
  data?: any[];
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
    title?: string;
    xAxis?: string;
    yAxis?: string;
    plotData?: {
      data: any[];
      layout: any;
    };
  };
  type?: string;
}

export interface ChatResponse {
  query: string;
  explanation: string;
  summary?: string;
  data?: any[];
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
    title?: string;
    xAxis?: string;
    yAxis?: string;
    plotData?: {
      data: any[];
      layout: any;
    };
  };
  sql?: string;
  type?: string;
}

export interface VisualizationProps {
  data: any[];
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  title?: string;
  xAxis?: string;
  yAxis?: string;
  plotData?: {
    data: any[];
    layout: any;
  };
} 