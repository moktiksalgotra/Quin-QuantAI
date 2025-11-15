import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
      // Adjusted: Use flex-col by default for stacking on small screens, use md:flex-row for desktop
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-gray-300 text-sm">X Axis:</label>
          <select
            value={selectedXAxis}
            onChange={(e) => setSelectedXAxis(e.target.value)}
            // Adjusted: Reduced padding for mobile
            className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-sm"
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
            <label className="text-gray-300 text-sm">Y Axis:</label>
            <select
              value={selectedYAxis}
              onChange={(e) => setSelectedYAxis(e.target.value)}
              // Adjusted: Reduced padding for mobile
              className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-sm"
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
    // Height set to a fixed 300px on mobile, but uses 400px on tablet/desktop
    const chartHeight = 300; 

    switch (chartType) {
      case 'bar':
        return (
          // Adjusted: Using min-h-[300px] for consistent chart height on mobile
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} style={{ fontSize: '12px' }} /> {/* Adjusted: Smaller font for axis labels */}
              <YAxis style={{ fontSize: '12px' }} /> {/* Adjusted: Smaller font for axis labels */}
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} /> {/* Adjusted: Smaller font for legend */}
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
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={selectedYAxis}
                nameKey={selectedXAxis}
                cx="50%"
                cy="50%"
                // Adjusted: Reduced outer radius for mobile
                outerRadius={120} 
                label
              >
                {data.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedXAxis} style={{ fontSize: '12px' }} />
              <YAxis dataKey={selectedYAxis} style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={selectedYAxis}
                nameKey={selectedXAxis}
                cx="50%"
                cy="50%"
                // Adjusted: Reduced outer/inner radius for mobile
                outerRadius={120}
                innerRadius={60}
                label
              >
                {data.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={selectedXAxis} style={{ fontSize: '10px' }} /> {/* Adjusted: Smaller font for angular axis */}
              <PolarRadiusAxis style={{ fontSize: '10px' }} />
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
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'radialBar':
        return (
          <ResponsiveContainer width="100%" minHeight={chartHeight} height="100%">
            <RadialBarChart innerRadius="20%" outerRadius="90%" data={data}>
              <RadialBar label dataKey={selectedYAxis} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const handleSaveAsPDF = async () => {
    const chartElement = document.getElementById('chart-container');
    if (!chartElement) return;
    // Set explicit size for canvas capture on mobile for better PDF generation
    const width = chartElement.offsetWidth;
    const height = chartElement.offsetHeight;
    
    const canvas = await html2canvas(chartElement, { 
      backgroundColor: '#22223b',
      width: width,
      height: height,
    });
    const imgData = canvas.toDataURL('image/png');
    
    // Use smaller unit (e.g., mm or pt) and adjust dimensions
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('chart.pdf');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-md">
      {/* Adjusted: Use w-full on smallest screens, p-4 instead of p-6, reduced max-width for better vertical fit */}
      <div className="bg-gray-900 bg-opacity-70 backdrop-blur-md rounded-lg p-4 sm:p-6 w-11/12 max-w-3xl max-h-[95vh] overflow-auto shadow-2xl animate-upload-modal">
        <div className="flex justify-between items-start mb-4">
          {/* Adjusted: Smaller font for mobile title */}
          <h3 className="text-lg sm:text-xl font-semibold text-gray-200">Data Visualization</h3>
          <div className="flex items-start gap-2">
            <button
              onClick={handleSaveAsPDF}
              // Adjusted: Smaller button/text for mobile
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-white/10 backdrop-blur-md rounded-xl shadow hover:bg-white/20 focus:outline-none focus:ring-0 border-none transition-colors mr-2"
            >
              Save as PDF
            </button>
            <button
              onClick={onClose}
              className="bg-transparent text-gray-400 hover:bg-transparent rounded-lg p-1 transition-colors focus:outline-none focus:ring-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Adjusted: Chart type buttons should be scrollable horizontally on small screens */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 whitespace-nowrap">
          {chartTypes.map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              // Adjusted: Smaller button/text for mobile
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-shrink-0 focus:outline-none focus:ring-0 ${
                chartType === type
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1).replace('Bar', ' Bar')}
            </button>
          ))}
        </div>

        {renderAxisSelectors()}

        {/* Adjusted: Reduced padding for chart container */}
        <div className="bg-Transparent rounded-lg p-2 sm:p-4" id="chart-container">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel;