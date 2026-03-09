'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, IndianRupee, Search } from 'lucide-react';
import ContactDetailsModal from '@/components/modals/ContactDetailsModal';
import api from '@/lib/api';
import { Parcel } from '@/types';
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

export default function FindParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTrips();
    fetchParcels();
  }, []);

  useEffect(() => {
    filterParcels();
  }, [originFilter, destFilter, parcels, myTrips]);

  const fetchMyTrips = async () => {
    try {
      const response = await api.get('/trips', {
        params: {
          page: 1,
          limit: 100,
        },
      });
      const trips = response.data?.data || response.data || [];
      console.log('My trips:', trips);
      setMyTrips(trips);

      // Auto-set filters based on user's first active trip
      if (trips.length > 0 && !originFilter && !destFilter) {
        const firstTrip = trips[0];
        const originAddress = (firstTrip as any).originAddress || firstTrip.origin?.address || '';
        const destAddress = (firstTrip as any).destAddress || firstTrip.destination?.address || '';

        // Extract city from address using helper function
        const origin = extractCityFromAddress(originAddress);
        const dest = extractCityFromAddress(destAddress);

        if (origin) setOriginFilter(origin);
        if (dest) setDestFilter(dest);

        toast.info(`Showing parcels matching your trip: ${origin} → ${dest}`);
      }
    } catch (error) {
      console.error('Failed to fetch my trips:', error);
    }
  };

  const fetchParcels = async () => {
    try {
      console.log('Attempting to fetch parcels...');

      // Use search endpoint with empty criteria to get all parcels
      const response = await api.post('/parcels/search', {}, {
        params: {
          page: 1,
          limit: 100,
        },
      });

      console.log('Raw API response:', response);
      console.log('Response data:', response.data);

      const allParcels = response.data?.data || response.data || [];
      console.log('All parcels count:', allParcels.length);
      console.log('All parcels:', allParcels);

      if (allParcels.length === 0) {
        console.warn('No parcels returned from API');
        toast.info('No parcels available at the moment. Create one to get started!');
      }

      // Filter only pending/draft parcels on the client side
      const pendingParcels = allParcels.filter((p: any) => {
        console.log('Checking parcel:', p.id, 'Status:', p.status);
        const status = (p.status || '').toUpperCase();
        const isPending = status === 'DRAFT' ||
               status === 'REQUESTING' ||
               status === 'PENDING' ||
               !p.tripId;
        console.log('Is pending?', isPending);
        return isPending;
      });

      console.log('Filtered pending parcels count:', pendingParcels.length);
      console.log('Pending parcels:', pendingParcels);

      setParcels(pendingParcels);
      setFilteredParcels(pendingParcels);
    } catch (error: any) {
      console.error('Failed to fetch parcels:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      toast.error(`Failed to load parcels: ${error.response?.data?.message || error.message}`);
      setParcels([]);
      setFilteredParcels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterParcels = () => {
    if (!originFilter && !destFilter) {
      setFilteredParcels(parcels);
      return;
    }

    const filtered = parcels.filter((parcel) => {
      const pickupAddr = ((parcel as any).pickupAddress || parcel.pickupLocation?.address || '').toLowerCase();
      const deliveryAddr = ((parcel as any).deliveryAddress || parcel.deliveryLocation?.address || '').toLowerCase();

      const originMatch = !originFilter || pickupAddr.includes(originFilter.toLowerCase());
      const destMatch = !destFilter || deliveryAddr.includes(destFilter.toLowerCase());

      return originMatch && destMatch;
    });

    setFilteredParcels(filtered);
  };

  const handleAcceptDelivery = async (parcel: any) => {
    if (myTrips.length === 0) {
      toast.error('Please create a trip first before accepting deliveries');
      return;
    }

    setIsAccepting(parcel.id);
    try {
      // Use the first active trip
      const activeTrip = myTrips[0];

      console.log('Accepting parcel:', parcel.id);
      console.log('Linking to trip:', activeTrip.id);

      // Use the accept endpoint for travelers (creates a match request)
      const response = await api.post(`/parcels/${parcel.id}/accept`, {
        tripId: activeTrip.id,
      });

      const matchRequest = response.data?.data || response.data;

      toast.success('Match request sent! Waiting for sender approval.');

      // Refresh parcels
      fetchParcels();
    } catch (error: any) {
      console.error('Failed to accept delivery:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to accept delivery');
    } finally {
      setIsAccepting(null);
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
        <h2 className="text-3xl font-bold tracking-tight">Find Parcels to Deliver</h2>
        <p className="text-muted-foreground mt-2">
          Browse available parcels that need delivery and earn money on your travels
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Route</CardTitle>
          <CardDescription>Enter city names to find parcels on your route</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Pickup City</Label>
              <Input
                id="origin"
                placeholder="e.g., Chandigarh"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest">Delivery City</Label>
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
          <CardTitle>Available Parcels ({filteredParcels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParcels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No parcels found</p>
              <p className="text-sm mt-2">
                {parcels.length === 0
                  ? 'No parcels available at the moment'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredParcels.map((parcel) => (
                <Card key={parcel.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-1">
                            {(parcel as any).title || parcel.description?.substring(0, 30) || 'Parcel'}
                          </h3>
                          <Badge variant="outline" className="mt-1">
                            {(parcel as any).size || parcel.category} - {parcel.weight}kg
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ₹{parcel.offeredPrice}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">Pickup</p>
                            <p className="text-muted-foreground text-xs truncate">
                              {(parcel as any).pickupAddress || parcel.pickupLocation?.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">Delivery</p>
                            <p className="text-muted-foreground text-xs truncate">
                              {(parcel as any).deliveryAddress || parcel.deliveryLocation?.address}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/parcels/${parcel.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAcceptDelivery(parcel)}
                          disabled={isAccepting === parcel.id}
                        >
                          {isAccepting === parcel.id ? 'Accepting...' : 'Accept'}
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
      {selectedParcel && (
        <ContactDetailsModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          type="parcel"
          contactPerson={{
            name: `${selectedParcel.sender?.firstName || ''} ${selectedParcel.sender?.lastName || ''}`.trim() || 'Sender',
            phone: (selectedParcel as any).recipientPhone || 'Not provided',
            email: (selectedParcel as any).recipientEmail,
          }}
          details={{
            from: (selectedParcel as any).pickupAddress || selectedParcel.pickupLocation?.address || 'Pickup location',
            to: (selectedParcel as any).deliveryAddress || selectedParcel.deliveryLocation?.address || 'Delivery location',
            date: (selectedParcel as any).pickupTimeStart ? format(new Date((selectedParcel as any).pickupTimeStart), 'PPP') : undefined,
            price: selectedParcel.offeredPrice,
            weight: selectedParcel.weight,
          }}
        />
      )}
    </div>
  );
}
