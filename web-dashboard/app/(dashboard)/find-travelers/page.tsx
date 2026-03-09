'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, IndianRupee, Package, User } from 'lucide-react';
import ContactDetailsModal from '@/components/modals/ContactDetailsModal';
import api from '@/lib/api';
import { Trip } from '@/types';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { statesByCountry } from '@/lib/location-data';

// Helper function to extract city from address by matching against known cities
const extractCityFromAddress = (address: string): string => {
  if (!address) return '';

  const parts = address.split(',').map(s => s.trim()).filter(Boolean);

  // Get all known cities from all countries
  const allCities = new Set<string>();
  Object.values(statesByCountry).forEach(states => {
    states.forEach(state => {
      state.cities.forEach(city => allCities.add(city));
    });
  });

  // Find the first part that matches a known city
  for (const part of parts) {
    if (allCities.has(part)) {
      return part;
    }
  }

  // Fallback: if no known city found, try to extract based on position
  // Format is typically: [Street,] City, State, Country
  // So city is either index 0 (no street) or index 1 (with street)
  if (parts.length >= 3) {
    // If we have at least 3 parts and first part doesn't look like a street number
    // (streets usually start with numbers), then first part is likely the city
    if (parts.length === 3 || !/^\d/.test(parts[0])) {
      return parts[0];
    }
    // Otherwise, second part is likely the city
    return parts[1] || parts[0];
  }

  return parts[0] || '';
};

export default function FindTravelersPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [myParcels, setMyParcels] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  useEffect(() => {
    fetchMyParcels();
    fetchTrips();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [originFilter, destFilter, trips]);

  const fetchMyParcels = async () => {
    try {
      const response = await api.get('/parcels', {
        params: {
          page: 1,
          limit: 100,
        },
      });
      const parcels = response.data?.data || response.data || [];
      console.log('My parcels:', parcels);
      setMyParcels(parcels);

      // Auto-set filters based on user's first unmatched parcel
      const unmatchedParcels = parcels.filter((p: any) => !p.tripId);
      if (unmatchedParcels.length > 0 && !originFilter && !destFilter) {
        const firstParcel = unmatchedParcels[0];
        const pickupAddress = (firstParcel as any).pickupAddress || firstParcel.pickupLocation?.address || '';
        const deliveryAddress = (firstParcel as any).deliveryAddress || firstParcel.deliveryLocation?.address || '';

        // Extract city from address using helper function
        const pickup = extractCityFromAddress(pickupAddress);
        const delivery = extractCityFromAddress(deliveryAddress);

        if (pickup) setOriginFilter(pickup);
        if (delivery) setDestFilter(delivery);

        toast.info(`Showing travelers matching your parcel: ${pickup} → ${delivery}`);
      }
    } catch (error) {
      console.error('Failed to fetch my parcels:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      console.log('Attempting to fetch trips...');

      // Use search endpoint with minimal criteria to get all trips
      const response = await api.post('/trips/search', {
        originLat: 0,
        originLng: 0,
        destLat: 0,
        destLng: 0,
        radiusKm: 50000, // Very large radius
      }, {
        params: {
          page: 1,
          limit: 100,
        },
      });

      console.log('Raw API response:', response);
      console.log('Response data:', response.data);

      const allTrips = response.data?.data || response.data || [];
      console.log('All trips count:', allTrips.length);
      console.log('All trips:', allTrips);

      if (allTrips.length === 0) {
        console.warn('No trips returned from API');
        toast.info('No travelers available at the moment. Check back later!');
      }

      // Filter only active trips on the client side
      const activeTrips = allTrips.filter((t: any) => {
        console.log('Checking trip:', t.id, 'Status:', t.status);
        const status = (t.status || '').toUpperCase();
        const isActive = status === 'DRAFT' ||
               status === 'PUBLISHED' ||
               status === 'PENDING' ||
               !t.matchedParcels ||
               (t.matchedParcels && t.matchedParcels.length === 0);
        console.log('Is active?', isActive);
        return isActive;
      });

      console.log('Filtered active trips count:', activeTrips.length);
      console.log('Active trips:', activeTrips);

      setTrips(activeTrips);
      setFilteredTrips(activeTrips);
    } catch (error: any) {
      console.error('Failed to fetch trips:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      toast.error(`Failed to load trips: ${error.response?.data?.message || error.message}`);
      setTrips([]);
      setFilteredTrips([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTrips = () => {
    if (!originFilter && !destFilter) {
      setFilteredTrips(trips);
      return;
    }

    const filtered = trips.filter((trip) => {
      const originAddr = ((trip as any).originAddress || trip.origin?.address || '').toLowerCase();
      const destAddr = ((trip as any).destAddress || trip.destination?.address || '').toLowerCase();

      const originMatch = !originFilter || originAddr.includes(originFilter.toLowerCase());
      const destMatch = !destFilter || destAddr.includes(destFilter.toLowerCase());

      return originMatch && destMatch;
    });

    setFilteredTrips(filtered);
  };

  const handleRequestMatch = async (trip: any) => {
    if (myParcels.length === 0) {
      toast.error('Please create a parcel first before requesting travelers');
      return;
    }

    setIsRequesting(trip.id);
    try {
      // Use the first unmatched parcel
      const unmatchedParcel = myParcels.find((p: any) => !p.tripId);
      if (!unmatchedParcel) {
        toast.error('All your parcels are already matched');
        setIsRequesting(null);
        return;
      }

      console.log('Requesting traveler for parcel:', unmatchedParcel.id);
      console.log('Trip:', trip.id);

      // Use the request endpoint for senders (creates a match request)
      const response = await api.post(`/parcels/${unmatchedParcel.id}/request`, {
        tripId: trip.id,
      });

      const matchRequest = response.data?.data || response.data;

      toast.success('Match request sent! Waiting for traveler approval.');

      // Refresh trips
      fetchTrips();
      fetchMyParcels();
    } catch (error: any) {
      console.error('Failed to request match:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to request match');
    } finally {
      setIsRequesting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Find Travelers</h2>
        <p className="text-muted-foreground mt-2">
          Find travelers going on your route who can deliver your parcel
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Route</CardTitle>
          <CardDescription>Enter city names to find travelers on your route</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">From City</Label>
              <Input
                id="origin"
                placeholder="e.g., Chandigarh"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest">To City</Label>
              <Input
                id="dest"
                placeholder="e.g., Bangalore"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Available Travelers ({filteredTrips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No travelers found</p>
              <p className="text-sm mt-2">
                {trips.length === 0
                  ? 'No travelers available at the moment'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center gap-1">
                            <span className="truncate">
                              {((trip as any).originAddress || trip.origin?.address || 'Origin').split(',')[0]}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="truncate">
                              {((trip as any).destAddress || trip.destination?.address || 'Destination').split(',')[0]}
                            </span>
                          </h3>
                          <Badge variant="outline" className="mt-1">
                            {(trip as any).maxWeight || trip.availableCapacity}kg capacity
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">From</p>
                            <p className="text-muted-foreground text-xs truncate">
                              {(trip as any).originAddress || trip.origin?.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">To</p>
                            <p className="text-muted-foreground text-xs truncate">
                              {(trip as any).destAddress || trip.destination?.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">
                            {format(
                              new Date((trip as any).departureTime || trip.departureDate),
                              'PPp'
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              ₹{(trip as any).basePricePerKg || trip.pricePerKg}/kg
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/trips/${trip.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRequestMatch(trip)}
                          disabled={isRequesting === trip.id}
                        >
                          {isRequesting === trip.id ? 'Requesting...' : 'Request'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details Modal */}
      {selectedTrip && (
        <ContactDetailsModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          type="trip"
          contactPerson={{
            name: `${selectedTrip.user?.firstName || selectedTrip.traveler?.firstName || ''} ${selectedTrip.user?.lastName || selectedTrip.traveler?.lastName || ''}`.trim() || 'Traveler',
            phone: selectedTrip.user?.phone || selectedTrip.traveler?.phone || 'Not provided',
            email: selectedTrip.user?.email || selectedTrip.traveler?.email,
          }}
          details={{
            from: (selectedTrip as any).originAddress || selectedTrip.origin?.address || 'Origin',
            to: (selectedTrip as any).destAddress || selectedTrip.destination?.address || 'Destination',
            date: format(new Date((selectedTrip as any).departureTime || selectedTrip.departureDate), 'PPP'),
            price: ((selectedTrip as any).basePricePerKg || selectedTrip.pricePerKg),
          }}
        />
      )}
    </div>
  );
}
