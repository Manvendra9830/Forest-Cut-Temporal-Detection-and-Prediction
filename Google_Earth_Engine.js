// // Define the region of interest: Indore, India
// var indoreGeometry = ee.Geometry.Point([75.8788, 22.7196]);  // Indore coordinates (Longitude, Latitude)

// // Define the time range: 2017 to 2024
// var startDate = '2017-01-01';
// var endDate = '2024-12-31';

// // Create a buffer around the point for better analysis
// var bufferedGeometry = indoreGeometry.buffer(50000); // 50km buffer for more comprehensive analysis

// // Load Sentinel-2 data and filter by time and region
// var sentinelCollection = ee.ImageCollection('COPERNICUS/S2_SR') // Using Surface Reflectance data
//   .filterBounds(bufferedGeometry)
//   .filterDate(startDate, endDate)
//   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// // Function to mask clouds using the SCL band
// function maskClouds(image) {
//   var scl = image.select('SCL');
//   var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)); // Remove clouds, cloud shadows, and cirrus
//   return image.updateMask(mask);
// }

// // Function to calculate NDVI from a Sentinel-2 image
// function calculateNdvi(image) {
//   // Apply cloud mask
//   var maskedImage = maskClouds(image);
  
//   // Calculate NDVI
//   var ndvi = maskedImage.normalizedDifference(['B8', 'B4']).rename('NDVI');
  
//   // Return image with NDVI 
//   return image.addBands(ndvi);
// }

// // Function to get season from date
// function getSeason(date) {
//   var month = date.get('month');
//   // Define seasons (for India)
//   // Winter: December-February
//   // Summer: March-May
//   // Monsoon: June-September
//   // Autumn: October-November
//   var season = ee.Algorithms.If(month.gte(12).or(month.lte(2)), 'Winter',
//                 ee.Algorithms.If(month.gte(3).and(month.lte(5)), 'Summer',
//                   ee.Algorithms.If(month.gte(6).and(month.lte(9)), 'Monsoon',
//                     'Autumn'))); 
//   return season;
// }

// // Apply the NDVI calculation to the Sentinel-2 collection
// var ndviCollection = sentinelCollection.map(function(image) {
//   // Calculate NDVI
//   var ndviImage = calculateNdvi(image);
  
//   // Get the date and season
//   var date = ee.Date(image.get('system:time_start'));
//   var season = getSeason(date);
  
//   // Calculate mean NDVI for the buffered region
//   var ndviValue = ndviImage.select('NDVI').reduceRegion({
//     reducer: ee.Reducer.mean(),
//     geometry: bufferedGeometry,
//     scale: 10,
//     maxPixels: 1e9
//   }).get('NDVI');
  
//   // Return as a feature with the NDVI and season information
//   return ee.Feature(null, {
//     'system:time_start': date.millis(),
//     'NDVI': ndviValue,
//     'season': season
//   });
// });

// // Create time series chart
// var timeSeriesChart = ui.Chart.feature.byFeature(ndviCollection, 'system:time_start', 'NDVI')
//   .setChartType('ScatterChart')
//   .setOptions({
//     title: 'NDVI Time Series for Indore (2017-2024)',
//     vAxis: {
//       title: 'NDVI',
//       viewWindow: {min: -1, max: 1}
//     },
//     hAxis: {
//       title: 'Date',
//       format: 'yyyy-MM-dd',
//       gridlines: {count: 12}
//     },
//     trendlines: { 0: {
//       color: 'red',
//       lineWidth: 2,
//       opacity: 0.5
//     }},
//     lineWidth: 0,
//     pointSize: 4,
//     series: {
//       0: { color: '#2ecc71' }
//     }
//   });

// // Create seasonal column chart instead of box plot
// var seasonalChart = ui.Chart.feature.byFeature(ndviCollection, 'season', 'NDVI')
//   .setChartType('ColumnChart')  // Changed from BoxChart to ColumnChart
//   .setOptions({
//     title: 'Seasonal NDVI Distribution',
//     vAxis: {title: 'NDVI'},
//     hAxis: {title: 'Season'}
//   });

// // Print charts
// print('Time Series Analysis:', timeSeriesChart);
// print('Seasonal Analysis:', seasonalChart);

// // Visualization parameters
// var ndviVis = {
//   min: -1,
//   max: 1,
//   palette: [
//     '#d73027', // red (low NDVI)
//     '#f46d43',
//     '#fdae61',
//     '#fee08b',
//     '#d9ef8b',
//     '#a6d96a',
//     '#66bd63',
//     '#1a9850'  // green (high NDVI)
//   ]
// };

// // Perform more advanced analysis
// // Calculate different NDVI metrics using reduce
// var ndviMetrics = {
//   mean: ndviCollection.map(function(image) {
//     return image.select('NDVI').reduceRegion({
//       reducer: ee.Reducer.mean(),
//       geometry: bufferedGeometry,
//       scale: 10,
//       maxPixels: 1e9
//     }).get('NDVI');
//   }),
//   median: ndviCollection.map(function(image) {
//     return image.select('NDVI').reduceRegion({
//       reducer: ee.Reducer.median(),
//       geometry: bufferedGeometry,
//       scale: 10,
//       maxPixels: 1e9
//     }).get('NDVI');
//   }),
//   min: ndviCollection.map(function(image) {
//     return image.select('NDVI').reduceRegion({
//       reducer: ee.Reducer.min(),
//       geometry: bufferedGeometry,
//       scale: 10,
//       maxPixels: 1e9
//     }).get('NDVI');
//   }),
//   max: ndviCollection.map(function(image) {
//     return image.select('NDVI').reduceRegion({
//       reducer: ee.Reducer.max(),
//       geometry: bufferedGeometry,
//       scale: 10,
//       maxPixels: 1e9
//     }).get('NDVI');
//   })
// };

// print('NDVI Metrics:', ndviMetrics);

// // Manually group NDVI values by season
// var seasonalNdviMetrics = ndviCollection.aggregate_stats('season');
// print('Seasonal NDVI Variations:', seasonalNdviMetrics);

// // Identify significant changes
// var firstNdvi = ndviCollection.first().get('NDVI');
// var lastNdvi = ndviCollection.sort('system:time_start', false).first().get('NDVI');

// var ndviChange = ee.Number(lastNdvi).subtract(ee.Number(firstNdvi));
// print('Total NDVI Change:', ndviChange);

// // Create the NDVI change calculation
// var firstImage = ee.Image(ndviCollection.first()).select('NDVI');
// var lastImage = ee.Image(ndviCollection.sort('system:time_start', false).first()).select('NDVI');
// var ndviChangeImage = lastImage.subtract(firstImage);

// // Define thresholds for classification
// var deforestationThreshold = -0.1;  // NDVI decrease threshold
// var afforestationThreshold = 0.1;    // NDVI increase threshold

// // Create masks for deforestation, afforestation, and no change
// var deforestation = ndviChangeImage.lt(deforestationThreshold);  // NDVI decrease
// var afforestation = ndviChangeImage.gt(afforestationThreshold);  // NDVI increase
// var noChange = ndviChangeImage.abs().lt(0.05);  // NDVI change near zero

// // Add layers to map
// Map.centerObject(bufferedGeometry, 12);

// // Add the deforestation layer
// Map.addLayer(deforestation, {palette: ['red']}, 'Deforestation');

// // Add the afforestation layer
// Map.addLayer(afforestation, {palette: ['green']}, 'Afforestation');

// // Add the no change layer
// Map.addLayer(noChange, {palette: ['blue']}, 'No Change');

// // Export data to Drive
// Export.table.toDrive({
//   collection: ndviCollection,
//   description: 'NDVI_TimeSeries_Indore',
//   fileFormat: 'CSV'
// });

// // Add a legend
// var legend = ui.Panel({
//   style: {
//     position: 'bottom-left',
//     padding: '8px 15px'
//   }
// });

// var legendTitle = ui.Label({
//   value: 'NDVI Values',
//   style: {
//     fontWeight: 'bold',
//     fontSize: '16px',
//     margin: '0 0 4px 0',
//     padding: '0'
//   }
// });

// legend.add(legendTitle);

// var makeRow = function(color, name) {
//   var colorBox = ui.Label({
//     style: {
//       backgroundColor: color,
//       padding: '8px',
//       margin: '0 0 4px 0'
//     }
//   });
//   var description = ui.Label({
//     value: name,
//     style: {margin: '0 0 4px 6px'}
//   });
//   return ui.Panel({
//     widgets: [colorBox, description],
//     layout: ui.Panel.Layout.Flow('horizontal')
//   });
// };

// legend.add(makeRow('red', 'Deforestation'));
// legend.add(makeRow('green', 'Afforestation'));
// legend.add(makeRow('blue', 'No Change'));

// Map.add(legend);

// Define the region of interest: Indore, India
var indoreGeometry = ee.Geometry.Point([75.8788, 22.7196]);  // Indore coordinates (Longitude, Latitude)

// Define the time range: 2017 to 2024
var startDate = '2017-01-01';
var endDate = '2024-12-31';

// Create a buffer around the point for better analysis
var bufferedGeometry = indoreGeometry.buffer(50000); // 50km buffer for more comprehensive analysis

// Load Sentinel-2 data and filter by time and region
var sentinelCollection = ee.ImageCollection('COPERNICUS/S2_SR') // Using Surface Reflectance data
  .filterBounds(bufferedGeometry)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// Function to mask clouds using the SCL band
function maskClouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)); // Remove clouds, cloud shadows, and cirrus
  return image.updateMask(mask);
}

// Function to calculate NDVI from a Sentinel-2 image
function calculateNdvi(image) {
  // Apply cloud mask
  var maskedImage = maskClouds(image);
  
  // Calculate NDVI
  var ndvi = maskedImage.normalizedDifference(['B8', 'B4']).rename('NDVI');
  
  // Return image with NDVI 
  return image.addBands(ndvi);
}

// Function to get season from date
function getSeason(date) {
  var month = date.get('month');
  // Define seasons (for India)
  // Winter: December-February
  // Summer: March-May
  // Monsoon: June-September
  // Autumn: October-November
  var season = ee.Algorithms.If(month.gte(12).or(month.lte(2)), 'Winter',
                 ee.Algorithms.If(month.gte(3).and(month.lte(5)), 'Summer',
                   ee.Algorithms.If(month.gte(6).and(month.lte(9)), 'Monsoon',
                     'Autumn'))); 
  return season;
}

// Apply the NDVI calculation to the Sentinel-2 collection
var ndviCollection = sentinelCollection.map(function(image) {
  // Calculate NDVI
  var ndviImage = calculateNdvi(image);
  
  // Get the date and season
  var date = ee.Date(image.get('system:time_start'));
  var season = getSeason(date);
  
  // Calculate mean NDVI for the buffered region
  var ndviValue = ndviImage.select('NDVI').reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: bufferedGeometry,
    scale: 10,
    maxPixels: 1e9
  }).get('NDVI');
  
  // Return as a feature with the NDVI and season information
  return ee.Feature(null, {
    'system:time_start': date.millis(),
    'NDVI': ndviValue,
    'season': season
  });
});

// Create time series chart
var timeSeriesChart = ui.Chart.feature.byFeature(ndviCollection, 'system:time_start', 'NDVI')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'NDVI Time Series for Indore (2017-2024)',
    vAxis: {
      title: 'NDVI',
      viewWindow: {min: -1, max: 1}
    },
    hAxis: {
      title: 'Date',
      format: 'yyyy-MM-dd',
      gridlines: {count: 12}
    },
    trendlines: { 0: {
      color: 'red',
      lineWidth: 2,
      opacity: 0.5
    }},
    lineWidth: 0,
    pointSize: 4,
    series: {
      0: { color: '#2ecc71' }
    }
  });

// Create seasonal column chart instead of box plot
var seasonalChart = ui.Chart.feature.byFeature(ndviCollection, 'season', 'NDVI')
  .setChartType('ColumnChart')  // Changed from BoxChart to ColumnChart
  .setOptions({
    title: 'Seasonal NDVI Distribution',
    vAxis: {title: 'NDVI'},
    hAxis: {title: 'Season'}
  });

// Print charts
print('Time Series Analysis:', timeSeriesChart);
print('Seasonal Analysis:', seasonalChart);

// Visualization parameters
var ndviVis = {
  min: -1,
  max: 1,
  palette: [
    '#d73027', // red (low NDVI)
    '#f46d43',
    '#fdae61',
    '#fee08b',
    '#d9ef8b',
    '#a6d96a',
    '#66bd63',
    '#1a9850'  // green (high NDVI)
  ]
};

// Apply seasonal NDVI analysis
var seasonalNdviAnalysis = ndviCollection.map(function(feature) {
  return ee.Feature(null, {
    'season': feature.get('season'),
    'NDVI': feature.get('NDVI')
  });
});

// Group by season and calculate mean and standard deviation
var seasonalStats = seasonalNdviAnalysis.reduceColumns({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  selectors: ['NDVI']
});

print('Seasonal NDVI Variations:', seasonalStats);


// Identify significant changes
var firstNdvi = ee.Number(ndviCollection.first().get('NDVI'));
var lastNdvi = ee.Number(ndviCollection.sort('system:time_start', false).first().get('NDVI'));

var ndviChange = lastNdvi.subtract(firstNdvi);
print('Total NDVI Change:', ndviChange);

// Modify the approach for NDVI change detection
// Create a composite image of first and last NDVI scenes
var firstNdviComposite = sentinelCollection.first().select('B8', 'B4');
var lastNdviComposite = sentinelCollection.sort('system:time_start', false).first().select('B8', 'B4');

// Calculate NDVI for first and last composites
var firstNdviImage = firstNdviComposite.normalizedDifference(['B8', 'B4']).rename('NDVI');
var lastNdviImage = lastNdviComposite.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Calculate NDVI change
var ndviChangeImage = lastNdviImage.subtract(firstNdviImage);

// Define thresholds for classification
var deforestationThreshold = -0.05;  // NDVI decrease threshold
var afforestationThreshold = 0.05;    // NDVI increase threshold

// Create masks for deforestation, afforestation, and no change
var deforestation = ndviChangeImage.lt(deforestationThreshold);  // NDVI decrease
var afforestation = ndviChangeImage.gt(afforestationThreshold);  // NDVI increase
var noChange = ndviChangeImage.abs().lt(0.00125);  // NDVI change near zero

// Add layers to map
Map.centerObject(bufferedGeometry, 12);

// Add the deforestation layer
Map.addLayer(deforestation, {palette: ['red']}, 'Deforestation');

// Add the afforestation layer
Map.addLayer(afforestation, {palette: ['green']}, 'Afforestation');

// Add the no change layer
Map.addLayer(noChange, {palette: ['gray']}, 'No Change');

// Export data to Drive
Export.table.toDrive({
  collection: ndviCollection,
  description: 'NDVI_TimeSeries',
  fileFormat: 'CSV'
});

// Add a legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'NDVI Values',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

legend.add(makeRow('red', 'Deforestation'));
legend.add(makeRow('green', 'Afforestation'));
legend.add(makeRow('blue', 'No Change'));

Map.add(legend);