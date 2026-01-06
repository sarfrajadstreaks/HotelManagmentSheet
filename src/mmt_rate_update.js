// ======= OTA RATE UPDATE SERVICE =======
// This file handles reading OTA_Rates sheet and updating rates via Goibibo API

// Room category to Goibibo rate plan code mapping
const GOIBIBO_RATE_PLAN_MAPPING = {
  // Room Category: { plan: { pax: code } }
  'Standard': {
    'EP': { '2': '990581915997', '1': '990581915997' },
    'CP': { '2': '990581915999', '1': '990581915999' },
    'MAP': { '2': '990581916000', '1': '990581916000' }
  },
  'Deluxe Rooms': {
    'EP': { '2': '990000570318', '1': '990000570318' },
    'CP': { '2': '990000570314', '1': '990000570314' },
    'MAP': { '2': '990000570319', '1': '990000570319' }
  },
  'Deluxe - Valley View': {
    'EP': { '2': '990000570322', '1': '990000570322' },
    'CP': { '2': '990000570321', '1': '990000570321' },
    'MAP': { '2': '990000570323', '1': '990000570323' }
  },
  'Deluxe - Twin Bed': {
    'EP': { '2': '990580234874', '1': '990580234874' },
    'CP': { '2': '990580234875', '1': '990580234875' },
    'MAP': { '2': '990581915991', '1': '990581915991' }
  },
  'Super Deluxe -Valley View': {
    'EP': { '2': '990580365528', '1': '990580365528' },
    'CP': { '2': '990580365529', '1': '990580365529' },
    'MAP': { '2': '990581477451', '1': '990581477451' }
  },
  'Executive Rooms': {
    'EP': { '2': '990581915988', '1': '990581915988' },
    'CP': { '2': '990581915989', '1': '990581915989' },
    'MAP': { '2': '990581915990', '1': '990581915990' }
  },
  'Executive - Valley View': {
    'EP': { '2': '990000570336', '1': '990000570336' },
    'CP': { '2': '990000570338', '1': '990000570338' },
    'MAP': { '2': '990000570334', '1': '990000570334' }
  },
  'Family Room': {
    'EP': { '4': '990580365537', '3': '990580365537', '2': '990580365537', '1': '990580365537' },
    'CP': { '4': '990580365538', '3': '990580365538', '2': '990580365538', '1': '990580365538' },
    'MAP': { '4': '990581477456', '3': '990581477456', '2': '990581477456', '1': '990581477456' }
  }
};

// Show the rate update modal
function showRateUpdateModal() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('rate_modal')
    .setWidth(400)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Update OTA Rates');
}

// Read OTA_Rates sheet data
function readOtaRatesSheet() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Ota_Rates');
  
  if (!sheet) {
    throw new Error('Ota_Rates sheet not found');
  }
  
  // Read data from rows 22-31 (starting row 22 = index 21 in 0-based)
  // Row 22: Plans (EP, CP, MAP)
  // Row 23: Pax (4 Adult, 3 Adult, 2 Adult, 1 Adult, Extra Adult Charge, Paid Child Charge)
  // Rows 24-31: Room categories and their rates
  
  const plansRow = sheet.getRange(22, 1, 1, 19).getValues()[0]; // Plans row
  const paxRow = sheet.getRange(23, 1, 1, 19).getValues()[0];   // Pax row
  const dataRows = sheet.getRange(24, 1, 8, 19).getValues();    // 8 room categories
  
  const ratesData = [];
  
  // Process each room category
  dataRows.forEach((row, idx) => {
    const roomCategory = row[0]; // First column is room category name
    
    if (!roomCategory) return;
    
    const categoryData = {
      category: roomCategory,
      plans: {}
    };
    
    // Process each plan type (EP, CP, MAP)
    let colIndex = 1;
    
    // EP columns (1-6): 4 Adult, 3 Adult, 2 Adult, 1 Adult, Extra Adult, Paid Child
    categoryData.plans['EP'] = {
      '4': row[1] || 0,
      '3': row[2] || 0,
      '2': row[3] || 0,
      '1': row[4] || 0,
      'extraAdult': row[5] || 0,
      'paidChild': row[6] || 0
    };
    
    // CP columns (7-12)
    categoryData.plans['CP'] = {
      '4': row[7] || 0,
      '3': row[8] || 0,
      '2': row[9] || 0,
      '1': row[10] || 0,
      'extraAdult': row[11] || 0,
      'paidChild': row[12] || 0
    };
    
    // MAP columns (13-18)
    categoryData.plans['MAP'] = {
      '4': row[13] || 0,
      '3': row[14] || 0,
      '2': row[15] || 0,
      '1': row[16] || 0,
      'extraAdult': row[17] || 0,
      'paidChild': row[18] || 0
    };
    
    ratesData.push(categoryData);
  });
  
  return ratesData;
}

// Convert OTA rates to Goibibo API format
function convertToGibiboFormat(ratesData, startDate, endDate) {
  const apiData = [];
  
  ratesData.forEach(categoryData => {
    const category = categoryData.category;
    const mapping = GOIBIBO_RATE_PLAN_MAPPING[category];
    
    if (!mapping) {
      Logger.log(`Warning: No mapping found for category: ${category}`);
      return;
    }
    
    // For each plan (EP, CP, MAP)
    ['EP', 'CP', 'MAP'].forEach(plan => {
      const planRates = categoryData.plans[plan];
      const planMapping = mapping[plan];
      
      if (!planMapping) {
        Logger.log(`Warning: No mapping found for ${category} - ${plan}`);
        return;
      }
      
      // Build sell_price object (only non-zero pax counts)
      const sellPrice = {};
      ['1', '2', '3', '4'].forEach(pax => {
        const rate = planRates[pax];
        if (rate && rate > 0) {
          sellPrice[pax] = parseFloat(rate);
        }
      });
      
      // Skip if no valid rates
      if (Object.keys(sellPrice).length === 0) {
        return;
      }
      
      // Get the rate plan code (use first available pax mapping)
      const ratePlanCode = planMapping['2'] || planMapping['1'] || planMapping['3'] || planMapping['4'];
      
      if (!ratePlanCode) {
        Logger.log(`Warning: No rate plan code found for ${category} - ${plan}`);
        return;
      }
      
      // Build the rate object
      const rateObject = {
        rates: {
          sell_price: sellPrice,
          extra_guest_price: {
            extra_adult: parseFloat(planRates.extraAdult) || 0,
            extra_child2: parseFloat(planRates.paidChild) || 0
          }
        },
        date_range_list: [
          {
            from_date: startDate,
            to_date: endDate
          }
        ],
        day_list: ['0', '1', '2', '3', '4', '5', '6'],
        level: 'rate_plan',
        code_list: [ratePlanCode],
        contract_type_list: ['b2c']
      };
      
      apiData.push(rateObject);
    });
  });
  
  return apiData;
}

// Main function to update rates via Goibibo API
function updateGibiboRates(startDate, endDate, authToken) {
  try {
    // Read rates from sheet
    const ratesData = readOtaRatesSheet();
    Logger.log('Rates data read from sheet: ' + JSON.stringify(ratesData));
    
    // Convert to Goibibo format
    const apiData = convertToGibiboFormat(ratesData, startDate, endDate);
    Logger.log('Converted API data: ' + JSON.stringify(apiData));
    
    if (apiData.length === 0) {
      throw new Error('No valid rate data to update');
    }
    
    // Prepare API request
    const payload = {
      hotel_code: '1000137321',
      data: apiData
    };
    
    const options = {
      method: 'put',
      contentType: 'application/json',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': 'Token ' + authToken,
        'country': 'in',
        'ingo-web': 'true',
        'language': 'en',
        'meta-data': '{"source":"extranet"}',
        'meta-data-brand': 'INGO',
        'meta-data-platform': 'web',
        'meta-data-source': 'ingo_web',
        'platform': 'Desktop',
        'source': 'ingo_web'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log('Making API request to Goibibo...');
    Logger.log('Payload: ' + JSON.stringify(payload, null, 2));
    
    // const response = UrlFetchApp.fetch('https://in.goibibo.com/api/v1/hotel-rates/', options);
    // const responseCode = response.getResponseCode();
    // const responseBody = response.getContentText();
    
    // Logger.log('Response Code: ' + responseCode);
    // Logger.log('Response Body: ' + responseBody);
    
    // if (responseCode === 200 || responseCode === 201) {
    //   SpreadsheetApp.getUi().alert(
    //     'Success',
    //     `✅ Rates updated successfully!\n\n` +
    //     `Date Range: ${startDate} to ${endDate}\n` +
    //     `Updated ${apiData.length} rate plans\n\n` +
    //     `Response: ${responseBody}`,
    //     SpreadsheetApp.getUi().ButtonSet.OK
    //   );
    //   return { success: true, message: 'Rates updated successfully', response: responseBody };
    // } else {
    //   throw new Error(`API returned status ${responseCode}: ${responseBody}`);
    // }
    
  } catch (error) {
    Logger.log('Error updating rates: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      'Error',
      `❌ Failed to update rates:\n\n${error.toString()}\n\nPlease check the logs for details.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

// Handler function called from the modal
function logRateInputs(startDate, endDate, authToken) {
  Logger.log('Start Date: ' + startDate);
  Logger.log('End Date: ' + endDate);
  Logger.log('Auth Token: ' + (authToken ? '***provided***' : 'not provided'));
  
  // Validate inputs
  if (!startDate || !endDate || !authToken) {
    SpreadsheetApp.getUi().alert(
      'Missing Information',
      'Please fill in all fields (Start Date, End Date, and Auth Token)',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // Update rates
  updateGibiboRates(startDate, endDate, authToken);
}