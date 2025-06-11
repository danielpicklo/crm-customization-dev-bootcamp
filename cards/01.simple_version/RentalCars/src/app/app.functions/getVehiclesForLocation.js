const axios = require("axios");

function searchVehiclesForLocation({ locationId }) {
  const data = JSON.stringify({
    filterGroups: [
      {
        filters: [
          {
            propertyName: "location",
            operator: "EQ",
            value: locationId
          },
          {
            propertyName: "available",
            operator: "EQ",
            value: "true"
          }
        ]
      }
    ],
    properties: ["vin", "make", "model", "year", "available", "hs_object_id", "daily_price"],
    limit: 100,
    after: 0
  });

  const config = {
    method: 'post',
    url: 'https://api.hubapi.com/crm/v3/objects/2-45804562/search',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env['PRIVATE_APP_ACCESS_TOKEN'],
    },
    data: data
  };

  return axios.request(config);
}

exports.main = async (context) => {
  try {
    const { locationId } = context.parameters;

    console.log('Fetching vehicles for location:', locationId);

    const response = await searchVehiclesForLocation({ locationId });
    console.log('Vehicles found:', response.data.results.length);

    return { results: response.data.results, total: response.data.total };
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return { error: error.message };
  }
}; 