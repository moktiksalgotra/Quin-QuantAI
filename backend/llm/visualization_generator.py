import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import pandas as pd
import json
from typing import List, Dict, Any, Optional
import base64
from io import BytesIO

class VisualizationGenerator:
    def __init__(self):
        self.supported_visualizations = {
            'bar': self._create_bar_chart,
            'line': self._create_line_chart,
            'pie': self._create_pie_chart,
            'scatter': self._create_scatter_plot,
            'table': self._create_table
        }

    def generate_visualization(self, 
                             data: List[Dict[str, Any]], 
                             viz_type: str,
                             title: Optional[str] = None,
                             x_label: Optional[str] = None,
                             y_label: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a visualization based on the data and visualization type.
        Returns a dictionary containing the visualization data and metadata.
        """
        if not data:
            return {
                'error': 'No data available for visualization'
            }

        # Convert data to pandas DataFrame
        df = pd.DataFrame(data)
        
        # Get the appropriate visualization function
        viz_func = self.supported_visualizations.get(viz_type.lower())
        if not viz_func:
            return {
                'error': f'Unsupported visualization type: {viz_type}. Supported types are: {", ".join(self.supported_visualizations.keys())}'
            }

        try:
            # Generate the visualization
            viz_data = viz_func(df, title, x_label, y_label)
            return viz_data
        except Exception as e:
            return {
                'error': f'Error generating visualization: {str(e)}'
            }

    def _create_bar_chart(self, 
                         df: pd.DataFrame,
                         title: Optional[str] = None,
                         x_label: Optional[str] = None,
                         y_label: Optional[str] = None) -> Dict[str, Any]:
        """Create a bar chart using Plotly."""
        # Get the first two columns for x and y
        x_col = df.columns[0]
        y_col = df.columns[1]

        fig = px.bar(df, 
                    x=x_col, 
                    y=y_col,
                    title=title or f'{y_col} by {x_col}',
                    labels={x_col: x_label or x_col, y_col: y_label or y_col})

        return {
            'type': 'bar',
            'data': json.loads(fig.to_json()),
            'title': title or f'{y_col} by {x_col}'
        }

    def _create_line_chart(self,
                          df: pd.DataFrame,
                          title: Optional[str] = None,
                          x_label: Optional[str] = None,
                          y_label: Optional[str] = None) -> Dict[str, Any]:
        """Create a line chart using Plotly."""
        x_col = df.columns[0]
        y_col = df.columns[1]

        fig = px.line(df,
                     x=x_col,
                     y=y_col,
                     title=title or f'{y_col} over {x_col}',
                     labels={x_col: x_label or x_col, y_col: y_label or y_col})

        return {
            'type': 'line',
            'data': json.loads(fig.to_json()),
            'title': title or f'{y_col} over {x_col}'
        }

    def _create_pie_chart(self,
                         df: pd.DataFrame,
                         title: Optional[str] = None,
                         x_label: Optional[str] = None,
                         y_label: Optional[str] = None) -> Dict[str, Any]:
        """Create a pie chart using Plotly."""
        labels_col = df.columns[0]
        values_col = df.columns[1]

        fig = px.pie(df,
                    names=labels_col,
                    values=values_col,
                    title=title or f'Distribution of {values_col} by {labels_col}')

        return {
            'type': 'pie',
            'data': json.loads(fig.to_json()),
            'title': title or f'Distribution of {values_col} by {labels_col}'
        }

    def _create_scatter_plot(self,
                           df: pd.DataFrame,
                           title: Optional[str] = None,
                           x_label: Optional[str] = None,
                           y_label: Optional[str] = None) -> Dict[str, Any]:
        """Create a scatter plot using Plotly."""
        x_col = df.columns[0]
        y_col = df.columns[1]

        fig = px.scatter(df,
                        x=x_col,
                        y=y_col,
                        title=title or f'{y_col} vs {x_col}',
                        labels={x_col: x_label or x_col, y_col: y_label or y_col})

        return {
            'type': 'scatter',
            'data': json.loads(fig.to_json()),
            'title': title or f'{y_col} vs {x_col}'
        }

    def _create_table(self,
                     df: pd.DataFrame,
                     title: Optional[str] = None,
                     x_label: Optional[str] = None,
                     y_label: Optional[str] = None) -> Dict[str, Any]:
        """Create a table visualization."""
        return {
            'type': 'table',
            'data': df.to_dict('records'),
            'columns': df.columns.tolist(),
            'title': title or 'Data Table'
        }

    def get_supported_visualizations(self) -> List[str]:
        """Return list of supported visualization types."""
        return list(self.supported_visualizations.keys()) 