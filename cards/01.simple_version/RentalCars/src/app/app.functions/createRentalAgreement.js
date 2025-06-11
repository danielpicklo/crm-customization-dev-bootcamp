const axios = require("axios");
const moment = require('moment');

async function createRentalAgreement({ vehicleId, contactId, startDate, endDate, insurance }) {
  const vehicleResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/vehicles/${vehicleId}?properties=make,model,year,daily_price`, { headers: {'Authorization': 'Bearer ' + process.env['PRIVATE_APP_ACCESS_TOKEN']}});
  const contactResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname`, { headers: {'Authorization': 'Bearer ' + process.env['PRIVATE_APP_ACCESS_TOKEN']}});
  
  const { daily_price } = vehicleResponse.data.properties;
  const totalDays = moment(endDate).diff(moment(startDate), 'days');

  
  // Create the rental agreement
  const properties = {
      start_date: new Date(startDate.formattedDate),
      end_date: new Date(endDate.formattedDate),
      cost_per_day: daily_price,
      insurance: insurance,
      total_days: totalDays,
      name: `${vehicleResponse.data.properties.make} ${vehicleResponse.data.properties.model} ${vehicleResponse.data.properties.year} - ${contactResponse.data.properties.firstname} ${contactResponse.data.properties.lastname}`,
    }

  const data = {
    properties: properties,
    associations: [
      {
        types: [
          {
            "associationCategory": "USER_DEFINED",
            "associationTypeId": "87"
          }
        ],
        to: {
          id: contactId
        }
      },
      {
        types: [
          {
            "associationCategory": "USER_DEFINED",
            "associationTypeId": "84"
          }
        ],
        to: {
          id: vehicleId
        }
      }
    ]
  }

  const response = await axios.post('https://api.hubapi.com/crm/v3/objects/2-45804812', data, { headers: {'Authorization': 'Bearer ' + process.env['PRIVATE_APP_ACCESS_TOKEN']}});

  // Update vehicle status to rented
  const updateVehicleData = JSON.stringify({
    properties: {
      available: "false"
    }
  });

  const updateVehicleConfig = {
    method: 'patch',
    url: `https://api.hubapi.com/crm/v3/objects/2-45804562/${vehicleId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env['PRIVATE_APP_ACCESS_TOKEN'],
    },
    data: updateVehicleData
  };

  await axios.request(updateVehicleConfig);

  return response;
}

exports.main = async (context) => {
  try {
    const { vehicleId, contactId, startDate, endDate, insurance } = context.parameters;

    console.log('Creating rental agreement:', {
      vehicleId,
      contactId,
      startDate,
      endDate,
      insurance
    });

    const response = await createRentalAgreement({
      vehicleId,
      contactId,
      startDate,
      endDate,
      insurance
    });

    console.log('Rental agreement created:', response.data.id);

    return {
      success: true,
      rentalAgreementId: response.data.id
    };
  } catch (error) {
    console.error('Error creating rental agreement:', error);
    return { error: error.message };
  }
}; 