import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
} from 'recharts';

interface DataPoint {
  [key: string]: string | number | boolean;
}

interface VisualizationPanelProps {
  data: DataPoint[];
  onClose: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ data, onClose }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'donut' | 'radar' | 'radialBar'>('bar');
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');

  if (!data || data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0]);
  const numericColumns = columns.filter(col => 
    typeof data[0][col] === 'number' || !isNaN(Number(data[0][col]))
  );
  const categoricalColumns = columns.filter(col => 
    typeof data[0][col] === 'string' || typeof data[0][col] === 'boolean'
  );

  // Initialize axis selections if not set
  React.useEffect(() => {
    if (!selectedXAxis && categoricalColumns.length > 0) {
      setSelectedXAxis(categoricalColumns[0]);
    }
    if (!selectedYAxis && numericColumns.length > 0) {
      setSelectedYAxis(numericColumns[0]);
    }
  }, [data]);

  const renderAxisSelectors = () => {
    return (
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-gray-300">X Axis:</label>
          <select
            value={selectedXAxis}
            onChange={(e) => setSelectedXAxis(e.target.value)}
            className="bg-gray-800 text-gray-200 rounded px-2 py-1"
          >
            {columns.map((col) => (
              <option key={`x-${col}`} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        {chartType !== 'pie' && (
          <div className="flex items-center gap-2">
            <label className="text-gray-300">Y Axis:</label>
            <select
              value={selectedYAxis}
              onChange={(e) => setSelectedYAxis(e.target.value)}
              className="bg-gray-800 text-gray-200 rounded px-2 py-1"
            >
              {numericColumns.map((col) => (
                <option key={`y-${col}`} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  const chartTypes = [
    'bar', 'line', 'pie', 'donut', 'area', 'scatter', 'radar', 'radialBar'
  ] as const;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((col, index) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((col, index) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey={selectedYAxis}
                nameKey={selectedXAxis}
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {data.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((col, index) => (
                <Area
                  key={col}
                  type="monotone"
                  dataKey={col}
                  fill={COLORS[index % COLORS.length]}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} />
              <YAxis dataKey={selectedYAxis} />
              <Tooltip />
              <Legend />
              {numericColumns.slice(0, 3).map((col, index) => (
                <Scatter
                  key={col}
                  name={col}
                  data={data}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey={selectedYAxis}
                nameKey={selectedXAxis}
                cx="50%"
                cy="50%"
                outerRadius={150}
                innerRadius={80}
                label
              >
                {data.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={selectedXAxis} />
              <PolarRadiusAxis />
              {numericColumns.slice(0, 3).map((col, index) => (
                <Radar
                  key={col}
                  name={col}
                  dataKey={col}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'radialBar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadialBarChart innerRadius="20%" outerRadius="90%" data={data}>
              <RadialBar label dataKey={selectedYAxis} />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-md">
      <div className="bg-gray-900 bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-auto shadow-2xl animate-upload-modal">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-200">Data Visualization</h3>
          <button
            onClick={onClose}
            className="bg-transparent text-gray-400 hover:bg-transparent rounded-lg p-2 transition-colors focus:outline-none focus:ring-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {chartTypes.map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-0 ${
                chartType === type
                  ? ''
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1).replace('Bar', ' Bar')} Chart
            </button>
          ))}
        </div>

        {renderAxisSelectors()}

        <div className="bg-Transparent rounded-lg p-4">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel; 