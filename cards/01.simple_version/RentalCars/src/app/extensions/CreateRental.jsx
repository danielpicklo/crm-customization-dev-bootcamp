import {
  Button,
  DateInput,
  Divider,
  Flex,
  Input,
  LoadingSpinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Modal,
  ModalBody,
  ModalFooter,
  Checkbox,
  Form,
  hubspot
} from "@hubspot/ui-extensions";
import _ from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from "react";

import {
  CrmActionButton,
  CrmActionLink,
  CrmCardActions
} from '@hubspot/ui-extensions/crm';


const ITEMS_PER_PAGE = 15;

// Define the extension to be run within the Hubspot CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <Extension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
    fetchProperties={actions.fetchCrmObjectProperties}
  />
));

const Extension = ({ context, runServerless, sendAlert, fetchProperties }) => {

  const [locations, setLocations] = useState([]);
  const [locationsOnPage, setLocationsOnPage] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesOnPage, setVehiclesOnPage] = useState([]);

  const [locationCount, setLocationCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [locationFetching, setLocationFetching] = useState(false);

  const [locationPage, setLocationPage] = useState(1);

  const [zipCode, setZipCode] = useState("");


  const [currentPage, setCurrentPage] = useState(1); // For controlling current page
  const [numPages, setNumPages] = useState(0); // For storing the total number of pages

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationVehicles, setLocationVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [rentalFormData, setRentalFormData] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    insurance: false
  });

  // Function to change the current page
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  // Whenever the locationCount or locations change, reset the paging
  useEffect(() => {
    setNumPages(Math.ceil(locationCount / ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [locationCount, locations]);

  // Calculate the slice of locations for the current page
  const locationsOnCurrentPage = locations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function fetchLocations() {
    sendAlert({ message: "Fetching locations...", type: "info" });
    setLocationFetching(true);
    runServerless({ name: "getLocations", parameters: { "zipCode": zipCode } }).then((resp) => {
      setLocations(resp.response.results);
      setLocationCount(resp.response.total);
      setLocationFetching(false);
      //reset the table
      setLocationPage(1);
    })

  }

  const debouncedFetchLocations = _.debounce(fetchLocations, 500);

  const fetchVehiclesForLocation = async (locationId) => {
    setIsLoadingVehicles(true);
    try {
      const response = await runServerless({
        name: "getVehiclesForLocation",
        parameters: { locationId }
      });
      console.log(response);
      setLocationVehicles(response.response.results);
    } catch (error) {
      sendAlert({ message: "Error fetching vehicles", type: "error" });
    }
    setIsLoadingVehicles(false);
  };

  const handleCreateRental = async (vehicleId) => {
    try {
      const response = await runServerless({
        name: "createRentalAgreement",
        parameters: {
          vehicleId,
          contactId: context.crm.objectId,
          startDate: rentalFormData.startDate,
          endDate: rentalFormData.endDate,
          insurance: rentalFormData.insurance
        }
      });
      console.log(response);
      sendAlert({ message: "Rental agreement created successfully!", type: "success" });
      setIsModalOpen(false);
      setRentalFormData({
        startDate: '',
        endDate: '',
        vehicleId: '',
        insurance: false
      });
    } catch (error) {
      sendAlert({ message: "Error creating rental agreement", type: "error" });
    }
  };

  return (
    <>
      <Flex direction="column" gap="sm">
        <Flex direction="row" justify="start" gap="sm" align="end">
          <Input
            name="zipCode"
            label="Zip Code"
            value={zipCode}
            onChange={(e) => setZipCode(e)}
          />
          <Button
            onClick={() => {
              fetchLocations();
            }}
            variant="primary"
            size="md"
            type="button"
          >
            Search!
          </Button>
        </Flex>
        <Divider />
        <Text>
          {locationFetching && <LoadingSpinner />}
        </Text>
      </Flex>
      <Table
        bordered={true}
        paginated={true}
        pageCount={numPages}
        onPageChange={(newPage) => changePage(newPage)}
      >
        <TableHead>
          <TableRow>
            <TableHeader>Zip</TableHeader>
            <TableHeader>Address</TableHeader>
            <TableHeader>Available Vehicles</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {locationsOnCurrentPage.map((location, index) => {
            return (
              <TableRow key={location.id}>
                <TableCell>
                  <CrmActionLink
                    actionType="PREVIEW_OBJECT"
                    actionContext={{
                      objectTypeId: "2-45804803",
                      objectId: location.id
                    }}
                    variant="secondary"
                  >
                    {location.properties.postal_code}
                  </CrmActionLink>
                </TableCell>
                <TableCell>{location.properties.address_1 + " " + location.properties.city + ", " + location.properties.state}</TableCell>
                <TableCell>{location.properties.number_of_available_vehicles}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setSelectedLocation(location);
                      fetchVehiclesForLocation(location.id);
                    }}
                    overlay={
                      <Modal
                        id="vehicle-modal"
                        title="Available Vehicles"
                        width="lg"
                      >
                        <ModalBody>
                          {isLoadingVehicles ? (
                            <LoadingSpinner />
                          ) : (
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableHeader>Vehicle</TableHeader>
                                  <TableHeader>Type</TableHeader>
                                  <TableHeader>Daily Rate</TableHeader>
                                  <TableHeader>Actions</TableHeader>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {locationVehicles.map((vehicle) => (
                                  <TableRow key={vehicle.id}>
                                    <TableCell>{vehicle.properties.vin}</TableCell>
                                    <TableCell>{vehicle.properties.make} {vehicle.properties.model} {vehicle.properties.year}</TableCell>
                                    <TableCell>${vehicle.properties.daily_price}</TableCell>
                                    <TableCell>
                                      <Button
                                        onClick={() => {
                                          setRentalFormData(prev => ({
                                            ...prev,
                                            vehicleId: vehicle.id
                                          }));
                                        }}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Rent This Vehicle
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          
                          {rentalFormData.vehicleId && (
                            <Form>
                              <Flex direction="column" gap="md" style={{ marginTop: '1rem' }}>
                                <DateInput
                                  label="Start Date"
                                  value={rentalFormData.startDate}
                                  onChange={(date) => setRentalFormData(prev => ({ ...prev, startDate: date }))}
                                />
                                <DateInput
                                  label="End Date"
                                  value={rentalFormData.endDate}
                                  onChange={(date) => setRentalFormData(prev => ({ ...prev, endDate: date }))}
                                />
                                <Checkbox
                                  checked={rentalFormData.insurance}
                                  name="insuranceCheck"
                                  description="Select to include insurance"
                                  onChange={(value) => setRentalFormData(prev => ({ ...prev, insurance: value }))}
                                >
                                  Rental Insurance
                                </Checkbox>
                              </Flex>
                            </Form>
                          )}
                        </ModalBody>
                        <ModalFooter>
                          <Button
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                          >
                            Close
                          </Button>
                          {rentalFormData.vehicleId && (
                            <Button
                              variant="primary"
                              onClick={() => handleCreateRental(rentalFormData.vehicleId)}
                              disabled={!rentalFormData.startDate || !rentalFormData.endDate}
                            >
                              Create Rental Agreement
                            </Button>
                          )}
                        </ModalFooter>
                      </Modal>
                    }
                    variant="primary"
                    size="sm"
                  >
                    View Vehicles
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

    </>
  );
};
