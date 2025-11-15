import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface DatabaseConnectionProps {
  onConnectionSuccess: () => void;
}

const DatabaseConnection: React.FC<DatabaseConnectionProps> = ({ onConnectionSuccess }) => {
  const [formData, setFormData] = useState({
    host: 'localhost',
    user: '',
    password: '',
    database: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [tablePreview, setTablePreview] = useState<any[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/db/connect`, formData);
      if (response.data.status === 'success') {
        onConnectionSuccess();
        await fetchTables();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/tables`);
      setTables(response.data.tables);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch tables');
    }
  };

  const handleTableSelect = async (tableName: string) => {
    setSelectedTable(tableName);
    try {
      const [schemaResponse, previewResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/db/table/${tableName}/schema`),
        axios.get(`${API_BASE_URL}/db/table/${tableName}/preview`)
      ]);
      setTableSchema(schemaResponse.data.schema);
      setTablePreview(previewResponse.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch table details');
    }
  };

  return (
    // Adjusted: Reduced outer padding to p-3 on small screens, using sm:p-4 for desktop size.
    <div className="p-3 sm:p-4"> 
      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Host</label>
          <input
            type="text"
            name="host"
            value={formData.host}
            onChange={handleInputChange}
            // Tailwind form class often handles responsiveness, ensure w-full is used.
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">User</label>
          <input
            type="text"
            name="user"
            value={formData.user}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Database</label>
          <input
            type="text"
            name="database"
            value={formData.database}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          // Adjusted: Reduced padding py-2 to py-1.5 on small screens
          className="inline-flex justify-center py-1.5 sm:py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>

      {error && (
        // Adjusted: Reduced padding for mobile
        <div className="mt-4 p-3 sm:p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {tables.length > 0 && (
        // Adjusted: Reduced margin-top on mobile
        <div className="mt-6 sm:mt-8"> 
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Tables</h3>
          {/* Adjusted: Use grid-cols-1 by default, and grid-cols-2 on sm breakpoint */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"> 
            {tables.map((table) => (
              <button
                key={table}
                onClick={() => handleTableSelect(table)}
                // Adjusted: Reduced padding for mobile
                className={`p-3 rounded-md border text-sm text-left ${ 
                  selectedTable === table
                    ? 'border-indigo-500 bg-indigo-50 font-semibold'
                    : 'border-gray-300 hover:border-indigo-500'
                }`}
              >
                {table}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTable && tableSchema.length > 0 && (
        // Adjusted: Reduced margin-top on mobile
        <div className="mt-6 sm:mt-8"> 
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Table Schema</h3>
          <div className="mt-2 overflow-x-auto">
            {/* Added: `min-w-full` and `overflow-x-auto` on parent handles horizontal scrolling */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Adjusted: Reduced horizontal padding on table headers for mobile */}
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Null
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableSchema.map((field, index) => (
                  <tr key={index}>
                    {/* Adjusted: Reduced horizontal padding and font size on table cells for mobile */}
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {field.Field}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {field.Type}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {field.Null}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {field.Key}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {field.Default}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTable && tablePreview.length > 0 && (
        // Adjusted: Reduced margin-top on mobile
        <div className="mt-6 sm:mt-8"> 
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Table Preview</h3>
          <div className="mt-2 overflow-x-auto">
            {/* Added: `min-w-full` and `overflow-x-auto` on parent handles horizontal scrolling */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(tablePreview[0]).map((column) => (
                    <th
                      key={column}
                      // Adjusted: Reduced horizontal padding on table headers for mobile
                      className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tablePreview.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, colIndex) => (
                      <td
                        key={colIndex}
                        // Adjusted: Reduced horizontal padding and font size on table cells for mobile
                        className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900"
                      >
                        {value !== null ? String(value) : 'NULL'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnection;