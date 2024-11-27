// Define the region of interest: Indore, India
// var indoreGeometry = ee.Geometry.Point([75.8788, 22.7196]);  // Indore coordinates (Longitude, Latitude)


Map.centerObject(geometry)
var bufferedGeometry = geometry6



// Define the time range: 2017 to 2024
var startDate = '2019-09-01';
var endDate = '2024-12-31';


// Load Sentinel-2 data and filter by time and region
var sentinelCollection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')  // Using Surface Reflectance data
 // Using Surface Reflectance data
  .filterBounds(bufferedGeometry)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
  //   .map(function(image) {
  //   return image.clip(bufferedGeometry);
  // });

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
  return image.addBands(ndvi).clip(bufferedGeometry);
}

// Function to get season from date
function getSeason(date) {
  var month = date.get('month');
  // Define seasons (for India)
  // Winter: December-Februaryi
  // Summer: March-May
  // Monsoon: June-September
  // Autumn: October-November
  var season = ee.Algorithms.If(month.gte(12).or(month.lte(2)), 'Winter',
                 ee.Algorithms.If(month.gte(3).and(month.lte(6)), 'Summer',
                   ee.Algorithms.If(month.gte(7).and(month.lte(9)), 'Monsoon',
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
    scale: 20,
    maxPixels: 1e13
  }).get('NDVI');
  
  // Return as a feature with the NDVI and season information
  return ee.Feature(null, {
    'system:time_start': date.millis(),
    'NDVI': ndviValue,
    'season': season
  });
});

// Evaluate and print the NDVI values
ndviCollection.evaluate(function(collection) {
  collection.features.forEach(function(feature) {
    var date = ee.Date(feature.properties['system:time_start']).format('YYYY-MM-dd');
    var ndvi = feature.properties['NDVI'];
    // print('NDVI value for date:', date, 'NDVI:', ndvi);
    // just for debugging
  });
});

// Create time series chart
var timeSeriesChart = ui.Chart.feature.byFeature(ndviCollection, 'system:time_start', 'NDVI')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'NDVI Time Series for Bheema Hostel (2019-2024)',
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

// Create seasonal column chart
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

// Export data to Drive
Export.table.toDrive({
  collection: ndviCollection,
  description: 'NDVI_TimeSeries',
  fileFormat: 'CSV'
});

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
var deforestationThreshold = -0.30;  // NDVI decrease threshold
var afforestationThreshold = 0.30;    // NDVI increase threshold

// Create masks for deforestation, afforestation, and no change
var deforestation = ndviChangeImage.lt(deforestationThreshold);  // NDVI decrease
var afforestation = ndviChangeImage.gt(afforestationThreshold);  // NDVI increase
var noChange = ndviChangeImage.abs().lt(0.20);  // NDVI change near zero

print(deforestation)
print(afforestation)
print(noChange)

// Add layers to map
Map.centerObject(bufferedGeometry, 12);
Map.addLayer(deforestation.clip(bufferedGeometry), {palette: ['red']}, 'Deforestation');
Map.addLayer(afforestation.clip(bufferedGeometry), {palette: ['green']}, 'Afforestation');
Map.addLayer(noChange.clip(bufferedGeometry), {palette: ['gray']}, 'No Change');

// // Export data to Drive
// Export.table.toDrive({
//   collection: ndviCollection,
//   description: 'NDVI_TimeSeries',
//   fileFormat: 'CSV'
// });

// Export data to Drive as CSV with specific filename
Export.table.toDrive({
  collection: ndviCollection,
  description: 'BheemaHostel2019to2024',  // This will be the name of the task
  fileNamePrefix: 'BheemaHostel2019to2024',  // Ensure the file name is as you desire
  fileFormat: 'CSV'
});

// Export NDVI time series data to Drive
Export.table.toDrive({
  collection: ndviCollection,
  description: 'NDVI_TimeSeries',
  fileFormat: 'CSV'
});


// Enhanced Legend Creation
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    backgroundColor: 'white',
    border: '1px solid black',
   }
});

var legendTitle = ui.Label({
  value: 'Land Cover Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 8px 0',
    padding: '0',
    color: '#333'
  }
});

legend.add(legendTitle);

var makeRow = function(color, name, description) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 8px 4px 0',
      border: '1px solid #999'
    }
  });
  
  var nameLabel = ui.Label({
    value: name,
    style: {
      fontWeight: 'bold',
      margin: '0 0 2px 0'
    }
  });
  
  var descLabel = ui.Label({
    value: description,
    style: {
      fontSize: '10px',
      color: '#666',
      margin: '0'
    }
  });
  
  var descPanel = ui.Panel({
    widgets: [nameLabel, descLabel],
    layout: ui.Panel.Layout.Flow('vertical')
  });
  
  return ui.Panel({
    widgets: [colorBox, descPanel],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// Detailed pixel-wise classification
var classificationImage = ndviChangeImage.where(
  ndviChangeImage.lt(deforestationThreshold), 1)  // Deforestation
  .where(ndviChangeImage.gt(afforestationThreshold), 2)  // Afforestation
  .where(ndviChangeImage.abs().lt(0.01), 3)  // No Significant Change
  .rename('LandCoverChange');

// Visualization parameters for classification
var classificationVis = {
  min: 1,
  max: 3,
  palette: ['red', 'green', 'gray'],
};

// Add classification layer
Map.addLayer(classificationImage.clip(bufferedGeometry), 
  classificationVis, 
  'Pixel-wise Land Cover Change'
);

// Enhanced Legend
legend.add(makeRow('red', 'Deforestation', 'Significant vegetation loss'));
legend.add(makeRow('green', 'Afforestation', 'Significant vegetation growth'));
legend.add(makeRow('gray', 'No Change', 'Stable vegetation cover'));

// Optional: Add classification statistics
var classStats = classificationImage.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: bufferedGeometry,
  scale: 20,
  maxPixels: 1e9
});

// Print classification statistics
print('Land Cover Change Statistics:', classStats);

Map.add(legend);