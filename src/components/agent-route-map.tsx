'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, Map as MapIcon, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Fix for default marker icon in Leaflet + Next.js
if (typeof window !== 'undefined') {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

// Helper: Calculate bearing between two points
const calculateBearing = (start: [number, number], end: [number, number]) => {
    const lat1 = (start[0] * Math.PI) / 180;
    const lat2 = (end[0] * Math.PI) / 180;
    const lon1 = (start[1] * Math.PI) / 180;
    const lon2 = (end[1] * Math.PI) / 180;

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360; // range [0, 360]
};

// 2D Top-Down Truck Icon (Orange Cab + Blue Body)
const getAgentTruckIcon = (rotation: number = 0) => {
    return new L.DivIcon({
        className: 'agent-truck-marker',
        html: `
            <div style="transform: rotate(${rotation}deg); transition: transform 0.8s ease-out;" class="relative">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Body (Blue) -->
                    <rect x="15" y="5" width="40" height="20" rx="2" fill="#2563EB" stroke="#1E40AF" stroke-width="1.5"/>
                    <rect x="20" y="8" width="30" height="2" rx="1" fill="white" fill-opacity="0.3"/>
                    <rect x="20" y="20" width="30" height="2" rx="1" fill="white" fill-opacity="0.3"/>
                    
                    <!-- Cab (Orange) -->
                    <rect x="0" y="6" width="18" height="18" rx="3" fill="#F97316" stroke="#C2410C" stroke-width="1.5"/>
                    <rect x="4" y="9" width="6" height="12" rx="1" fill="#FFEDD5"/>
                    
                    <!-- Details -->
                    <rect x="15" y="6" width="3" height="18" fill="#1E3A8A"/>
                </svg>
            </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 15],
    });
};

// Orange Pulsing Destination Point
const orangeDestinationIcon = typeof window !== 'undefined' ? new L.DivIcon({
    className: 'destination-marker',
    html: `
        <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 bg-orange-500/20 rounded-full animate-ping"></div>
            <div class="absolute w-6 h-6 bg-orange-500/40 rounded-full animate-pulse"></div>
            <div class="relative w-4 h-4 bg-orange-600 rounded-full border-2 border-white shadow-xl"></div>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
}) : null;

const availableIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface AgentRouteMapProps {
    agentLocation: { lat: number, lng: number } | null;
    tasks: any[];
    focusedTaskId?: string;
    onTaskSelect?: (taskId: string | null) => void;
}

function MapInteractionDetector({ onInteraction }: { onInteraction: () => void }) {
    useMapEvents({
        dragstart: () => onInteraction(),
        zoomstart: () => onInteraction(),
        mousedown: () => onInteraction(),
    });
    return null;
}

function MapUpdater({ center, bounds, isManualMode }: { center?: [number, number], bounds?: L.LatLngBoundsExpression, isManualMode: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (isManualMode) return;

        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        } else if (center) {
            map.setView(center, map.getZoom());
        }
    }, [bounds, center, map, isManualMode]);
    return null;
}

export default function AgentRouteMap({ agentLocation, tasks, focusedTaskId, onTaskSelect }: AgentRouteMapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [roadPoints, setRoadPoints] = useState<[number, number][]>([]);
    const [isRouting, setIsRouting] = useState(false);
    const [routeStats, setRouteStats] = useState<{ distance: number, duration: number } | null>(null);
    const [isManualMode, setIsManualMode] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Performance optimization refs
    const lastRouteLocationRef = useRef<{ lat: number, lng: number } | null>(null);
    const lastTaskCountRef = useRef<number>(0);
    const lastFocusedTaskIdRef = useRef<string | undefined>(undefined);
    const prevAgentLocationRef = useRef<{ lat: number, lng: number } | null>(null);

    // Helper: Rough distance in meters
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Helper: check if coordinates are valid (not 0,0 or missing)
    const hasValidCoords = (t: any) => t.pickupLat && t.pickupLng && !(t.pickupLat === 0 && t.pickupLng === 0);

    const assignedTasks = (focusedTaskId
        ? tasks.filter(t => t.id === focusedTaskId)
        : tasks.filter(t => t.status !== 'PENDING' && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    ).filter(hasValidCoords);

    useEffect(() => {
        setIsMounted(true);
        // Auto-detect night mode (after 6 PM or before 7 AM)
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 7) {
            setIsDarkMode(true);
        }
    }, []);

    // Track rotation
    useEffect(() => {
        if (agentLocation) {
            if (prevAgentLocationRef.current) {
                const dist = getDistance(agentLocation.lat, agentLocation.lng, prevAgentLocationRef.current.lat, prevAgentLocationRef.current.lng);
                if (dist > 5) {
                    const bearing = calculateBearing(
                        [prevAgentLocationRef.current.lat, prevAgentLocationRef.current.lng],
                        [agentLocation.lat, agentLocation.lng]
                    );
                    setRotation(bearing - 180);
                }
            }
            prevAgentLocationRef.current = agentLocation;
        }
    }, [agentLocation]);

    // Reset manual mode when a new task is focused or task list changes
    useEffect(() => {
        setIsManualMode(false);
    }, [focusedTaskId, tasks.length]);

    // Road Routing Logic with OSRM (TSP - Shortest Path)
    useEffect(() => {
        if (!agentLocation || assignedTasks.length === 0) {
            setRoadPoints([]);
            setRouteStats(null);
            lastRouteLocationRef.current = null;
            return;
        }

        const distanceMoved = lastRouteLocationRef.current
            ? getDistance(agentLocation.lat, agentLocation.lng, lastRouteLocationRef.current.lat, lastRouteLocationRef.current.lng)
            : Infinity;

        const taskCountChanged = assignedTasks.length !== lastTaskCountRef.current;
        const focusChanged = focusedTaskId !== lastFocusedTaskIdRef.current;

        if (distanceMoved < 100 && !taskCountChanged && !focusChanged) {
            return;
        }

        const fetchRoadPoints = async () => {
            setIsRouting(true);
            try {
                const coords = [
                    `${agentLocation.lng},${agentLocation.lat}`,
                    ...assignedTasks.map(t => `${t.pickupLng},${t.pickupLat}`)
                ].join(';');

                const response = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson&steps=true`);
                const data = await response.json();

                if (data.code === 'Ok' && data.trips?.[0]) {
                    let allCoordinates: [number, number][] = [];
                    if (data.trips[0].geometry?.coordinates) {
                        allCoordinates = data.trips[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                    }

                    if (allCoordinates.length > 0) {
                        setRoadPoints(allCoordinates);
                        setRouteStats({
                            distance: data.trips[0].distance / 1000,
                            duration: data.trips[0].duration / 60
                        });

                        if (data.waypoints) {
                            data.waypoints.forEach((wp: any, index: number) => {
                                if (index === 0) return;
                                if (assignedTasks[index - 1]) {
                                    assignedTasks[index - 1].optimalOrder = wp.waypoint_index;
                                }
                            });
                        }

                        lastRouteLocationRef.current = agentLocation;
                        lastTaskCountRef.current = assignedTasks.length;
                        lastFocusedTaskIdRef.current = focusedTaskId;
                    }
                }
            } catch (error) {
                console.error("OSRM Routing failed:", error);
            } finally {
                setIsRouting(false);
            }
        };

        fetchRoadPoints();
    }, [agentLocation, assignedTasks.length, focusedTaskId]);

    const handleGoogleMapsNavigation = () => {
        if (!agentLocation || assignedTasks.length === 0) {
            toast.error("No active tasks to navigate to");
            return;
        }

        const orderedTasks = [...assignedTasks].sort((a, b) => (a.optimalOrder || 0) - (b.optimalOrder || 0));
        const origin = `${agentLocation.lat},${agentLocation.lng}`;
        const destination = `${orderedTasks[orderedTasks.length - 1].pickupLat},${orderedTasks[orderedTasks.length - 1].pickupLng}`;
        const waypoints = orderedTasks.slice(0, -1)
            .map(t => `${t.pickupLat},${t.pickupLng}`)
            .join('|');

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
        window.open(googleMapsUrl, '_blank');
    };

    if (!isMounted) {
        return (
            <div className="h-[400px] w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-500 border border-gray-200">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Initializing Map...
            </div>
        );
    }

    const availableTasks = focusedTaskId ? [] : tasks.filter(t => t.status === 'PENDING' && hasValidCoords(t));
    const center: [number, number] | undefined = (!focusedTaskId && agentLocation)
        ? [agentLocation.lat, agentLocation.lng]
        : (!focusedTaskId && tasks.length > 0 && tasks[0].pickupLat ? [tasks[0].pickupLat, tasks[0].pickupLng] : [20.5937, 78.9629]);

    const mapBounds: L.LatLngBoundsExpression | undefined = (focusedTaskId && agentLocation && assignedTasks.length > 0)
        ? [
            [agentLocation.lat, agentLocation.lng],
            [assignedTasks[0].pickupLat, assignedTasks[0].pickupLng]
        ]
        : undefined;

    return (
        <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group z-0">
            <div className="absolute top-3 right-3 z-[9999] flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <Button
                        size="sm"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`backdrop-blur-md border border-black/5 shadow-xl font-black text-[10px] uppercase tracking-wider gap-2 h-8 px-3 rounded-xl transition-all ${isDarkMode ? 'bg-indigo-900/90 text-white hover:bg-indigo-800' : 'bg-white/90 text-gray-900 hover:bg-white'}`}
                    >
                        {isDarkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                        {isDarkMode ? 'Night' : 'Day'}
                    </Button>

                    {assignedTasks.length > 0 && (
                        <Button
                            size="sm"
                            onClick={handleGoogleMapsNavigation}
                            className="bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 border border-black/5 shadow-xl font-black text-[10px] uppercase tracking-wider gap-2 h-8 px-3 rounded-xl transition-all"
                        >
                            <Navigation className="h-3.5 w-3.5 text-blue-600" />
                            Navigation
                        </Button>
                    )}
                </div>

                {isManualMode && (
                    <Button
                        size="sm"
                        onClick={() => setIsManualMode(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-xl font-black text-[10px] uppercase tracking-wider gap-2 h-8 px-3 rounded-xl transition-all animate-in zoom-in duration-200"
                    >
                        <MapIcon className="h-3.5 w-3.5" />
                        Recenter
                    </Button>
                )}
            </div>

            {routeStats && assignedTasks.length > 0 && (
                <div className="absolute top-3 left-3 z-[9999]">
                    <div className="bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-2xl space-y-1 min-w-[140px]">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Distance</span>
                            <span className="text-xs font-black text-white">{routeStats.distance.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Est. Time</span>
                            <span className="text-xs font-black text-green-400">{Math.ceil(routeStats.duration)} mins</span>
                        </div>
                    </div>
                </div>
            )}

            {isRouting && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999]">
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-2xl flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-300">
                        <Loader2 className="h-3 w-3 animate-spin text-green-400" />
                        Updating Route...
                    </div>
                </div>
            )}

            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={isDarkMode
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                />

                {agentLocation && (
                    <Marker position={[agentLocation.lat, agentLocation.lng]} icon={getAgentTruckIcon(rotation)}>
                        <Popup>
                            <div className="font-bold text-blue-600">Your Current Location</div>
                        </Popup>
                    </Marker>
                )}

                {availableTasks.map(task => (
                    <Marker
                        key={task.id}
                        position={[task.pickupLat, task.pickupLng]}
                        icon={availableIcon}
                        eventHandlers={{
                            click: () => {
                                if (onTaskSelect) onTaskSelect(task.id);
                            }
                        }}
                    >
                        <Popup>
                            <div className="space-y-1 min-w-[120px]">
                                <div className="font-bold text-blue-600 flex items-center justify-between">
                                    Available
                                    {task.distance !== undefined && (
                                        <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
                                            {task.distance < 1 ? `${(task.distance * 1000).toFixed(0)}m` : `${task.distance.toFixed(1)}km`}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-semibold">{task.user?.name}</div>
                                <div className="text-[10px] text-gray-500">{task.address?.street}</div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {assignedTasks.map((task) => (
                    <Marker
                        key={task.id}
                        position={[task.pickupLat, task.pickupLng]}
                        icon={orangeDestinationIcon as L.DivIcon}
                        eventHandlers={{
                            click: () => {
                                if (onTaskSelect) onTaskSelect(task.id);
                            }
                        }}
                    >
                        <Popup>
                            <div className="space-y-1 min-w-[120px]">
                                <div className="font-bold text-orange-600 flex items-center justify-between">
                                    {task.optimalOrder ? `Stop #${task.optimalOrder}` : 'Assigned Stop'}
                                    {task.distance !== undefined && (
                                        <span className="text-[10px] bg-orange-50 px-1.5 py-0.5 rounded text-orange-700">
                                            {task.distance < 1 ? `${(task.distance * 1000).toFixed(0)}m` : `${task.distance.toFixed(1)}km`}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-semibold">{task.user?.name}</div>
                                <div className="text-[10px] text-gray-500 font-medium">{task.address?.street}</div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {roadPoints.length > 1 && (
                    <Polyline
                        positions={roadPoints}
                        color="#1d4ed8"
                        weight={8}
                        opacity={0.9}
                    />
                )}

                <MapInteractionDetector onInteraction={() => setIsManualMode(true)} />
                <MapUpdater center={center} bounds={mapBounds} isManualMode={isManualMode} />
            </MapContainer>
        </div >
    );
}
