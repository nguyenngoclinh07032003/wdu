import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import classNames from 'classnames/bind';
import styles from '../Styles/ShipperDeliveryMap.module.scss';

const cx = classNames.bind(styles);

const VIETNAM_CENTER = [16.0544, 108.2022];
const DEFAULT_ZOOM = 6;

const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();

const shipperIcon = L.divIcon({
    className: cx('markerIcon'),
    html: '<div class="shipper-pin">🚚</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
});

const deliveryIcon = L.divIcon({
    className: cx('markerIcon'),
    html: '<div class="delivery-pin">📦</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
});

function runGeocodeTask(task) {
    const run = geocodeQueue.then(task);
    geocodeQueue = run.catch(() => {});
    return run;
}

async function geocodeAddress(address) {
    const normalized = String(address || '').trim();
    if (!normalized) return null;

    if (geocodeCache.has(normalized)) {
        return geocodeCache.get(normalized);
    }

    return runGeocodeTask(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));

        try {
            const query = encodeURIComponent(`${normalized}, Vietnam`);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
                { headers: { 'Accept-Language': 'vi' } },
            );

            if (!response.ok) return null;

            const results = await response.json();
            if (!results?.length) return null;

            const position = [parseFloat(results[0].lat), parseFloat(results[0].lon)];
            geocodeCache.set(normalized, position);
            return position;
        } catch {
            return null;
        }
    });
}

function FitBounds({ positions }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length === 0) return;

        if (positions.length === 1) {
            map.setView(positions[0], 14);
            return;
        }

        map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 15 });
    }, [map, positions]);

    return null;
}

function getOrderAddress(order) {
    return order?.address || order?.deliveryAddress || order?.addressUser || '';
}

function getActiveDeliveryOrders(orders) {
    return orders.filter((order) => {
        const status = String(order?.status || '').toLowerCase();
        return status === 'confirmed' || status === 'shipping' || status === 'returning';
    });
}

function ShipperDeliveryMap({ shippers = [], orders = [] }) {
    const [markers, setMarkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const requestId = useRef(0);

    const activeOrders = useMemo(() => getActiveDeliveryOrders(orders), [orders]);

    const buildMarkers = useCallback(async () => {
        const currentRequest = ++requestId.current;
        setLoading(true);

        const nextMarkers = [];
        const seenAddresses = new Set();

        for (const order of activeOrders) {
            const address = getOrderAddress(order);
            if (!address || seenAddresses.has(address)) continue;

            const position = await geocodeAddress(address);
            if (!position || currentRequest !== requestId.current) continue;

            seenAddresses.add(address);
            const status = String(order?.status || '').toLowerCase();

            nextMarkers.push({
                id: `delivery-${order._id}`,
                type: 'delivery',
                position,
                title: order?.shipperName ? `Đơn #${String(order._id).slice(-6)}` : 'Điểm giao hàng',
                subtitle: address,
                meta:
                    status === 'shipping'
                        ? 'Đang giao'
                        : status === 'returning'
                          ? 'Đang hoàn'
                          : order?.shipperName
                            ? `Shipper: ${order.shipperName}`
                            : 'Chờ giao',
            });
        }

        for (const shipper of shippers) {
            if (shipper?.isActive === false) continue;

            const shipperOrders = activeOrders.filter(
                (order) => String(order?.shipperId) === String(shipper?._id) && String(order?.status).toLowerCase() === 'shipping',
            );

            const referenceOrder = shipperOrders[0] || activeOrders.find((order) => String(order?.shipperId) === String(shipper?._id));

            let position = null;
            if (referenceOrder) {
                const address = getOrderAddress(referenceOrder);
                position = await geocodeAddress(address);
                if (position && currentRequest === requestId.current) {
                    position = [position[0] + 0.002, position[1] + 0.002];
                }
            }

            if (!position && currentRequest === requestId.current) {
                const fallbackAddress = 'Ho Chi Minh City, Vietnam';
                position = await geocodeAddress(fallbackAddress);
            }

            if (!position || currentRequest !== requestId.current) continue;

            nextMarkers.push({
                id: `shipper-${shipper._id}`,
                type: 'shipper',
                position,
                title: shipper.fullname || 'Shipper',
                subtitle: referenceOrder ? getOrderAddress(referenceOrder) : 'Sẵn sàng nhận đơn',
                meta: shipperOrders.length ? `Đang giao ${shipperOrders.length} đơn` : 'Sẵn sàng',
            });
        }

        if (currentRequest === requestId.current) {
            setMarkers(nextMarkers);
            setLoading(false);
        }
    }, [activeOrders, shippers]);

    useEffect(() => {
        buildMarkers();
    }, [buildMarkers]);

    const positions = useMemo(() => markers.map((marker) => marker.position), [markers]);

    return (
        <div className={cx('mapWrapper')}>
            {loading && (
                <div className={cx('mapOverlay')}>
                    <span>Đang tải bản đồ...</span>
                </div>
            )}

            <MapContainer center={VIETNAM_CENTER} zoom={DEFAULT_ZOOM} className={cx('map')} scrollWheelZoom>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds positions={positions} />

                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={marker.type === 'shipper' ? shipperIcon : deliveryIcon}
                    >
                        <Popup>
                            <div className={cx('popup')}>
                                <strong>{marker.title}</strong>
                                <p>{marker.subtitle}</p>
                                <span>{marker.meta}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className={cx('legend')}>
                <span>
                    <i className={cx('dot', 'shipper')} /> Shipper
                </span>
                <span>
                    <i className={cx('dot', 'delivery')} /> Điểm giao
                </span>
                <span className={cx('count')}>
                    {!loading && markers.length === 0 ? 'Chưa có đơn đang giao' : `${markers.length} điểm`}
                </span>
            </div>
        </div>
    );
}

export default ShipperDeliveryMap;
