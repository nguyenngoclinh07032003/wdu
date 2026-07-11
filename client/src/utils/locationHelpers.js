const NOMINATIM_HEADERS = {
    'Accept-Language': 'vi',
    'User-Agent': 'WDU-Healthcare-App/1.0 (linhnnhe171195@fpt.edu.vn)',
};

const normalizeLocationName = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\./g, '')
        .replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\s+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const namesMatch = (left, right) => {
    const a = normalizeLocationName(left);
    const b = normalizeLocationName(right);

    if (!a || !b) return false;

    return a === b || a.includes(b) || b.includes(a);
};

const findByNameCandidates = (items, candidates = [], nameKey = 'full_name') => {
    if (!Array.isArray(items) || !items.length) return null;

    for (const candidate of candidates.filter(Boolean)) {
        const found = items.find((item) => namesMatch(item?.[nameKey], candidate));
        if (found) return found;
    }

    return null;
};

export const getAccuratePosition = ({
    maxWaitMs = 20000,
    targetAccuracyMeters = 25,
} = {}) =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Trình duyệt không hỗ trợ định vị'));
            return;
        }

        let bestPosition = null;
        let watchId = null;
        let settled = false;
        const startedAt = Date.now();

        const cleanup = () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
        };

        const finish = (position) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(position);
        };

        const fail = (error) => {
            if (settled) return;

            if (bestPosition) {
                finish(bestPosition);
                return;
            }

            settled = true;
            cleanup();
            reject(error);
        };

        const handlePosition = (position) => {
            const accuracy = Number(position?.coords?.accuracy ?? Infinity);

            if (!bestPosition || accuracy < Number(bestPosition.coords.accuracy ?? Infinity)) {
                bestPosition = position;
            }

            if (accuracy <= targetAccuracyMeters || Date.now() - startedAt >= maxWaitMs) {
                finish(bestPosition);
            }
        };

        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: maxWaitMs,
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handlePosition(position);

                if (settled) return;

                watchId = navigator.geolocation.watchPosition(handlePosition, fail, options);
            },
            (error) => {
                watchId = navigator.geolocation.watchPosition(handlePosition, fail, options);
            },
            options,
        );

        setTimeout(() => {
            if (bestPosition) {
                finish(bestPosition);
                return;
            }

            if (!settled) {
                fail(new Error('Lấy vị trí quá lâu. Hãy thử lại.'));
            }
        }, maxWaitMs + 500);
    });

export const reverseGeocodeCoordinates = async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error('Tọa độ không hợp lệ');
    }

    const params = new URLSearchParams({
        format: 'json',
        lat: String(lat),
        lon: String(lng),
        addressdetails: '1',
        zoom: '18',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: NOMINATIM_HEADERS,
    });

    if (!response.ok) {
        throw new Error('Không thể đọc địa chỉ từ tọa độ');
    }

    const data = await response.json();
    const address = data?.address || {};

    const detailParts = [address.house_number, address.road || address.pedestrian || address.footway].filter(
        Boolean,
    );

    return {
        displayName: data?.display_name || '',
        address,
        detail: detailParts.join(' ').trim(),
        provinceCandidates: [address.state, address.city, address.region, address.county, address.municipality],
        wardCandidates: [
            address.suburb,
            address.neighbourhood,
            address.quarter,
            address.village,
            address.town,
            address.city_district,
            address.district,
            address.hamlet,
        ],
    };
};

export const findMatchingProvince = (provinces, geoResult) => {
    return findByNameCandidates(provinces, geoResult?.provinceCandidates || [], 'full_name');
};

export const findMatchingWard = (wards, geoResult) => {
    return findByNameCandidates(wards, geoResult?.wardCandidates || [], 'full_name');
};

export const getGeolocationErrorMessage = (error) => {
    if (!error) return 'Không thể lấy vị trí hiện tại';

    if (error.code === 1 || error.code === error?.PERMISSION_DENIED) {
        return 'Bạn đã từ chối quyền vị trí. Hãy cho phép Location trên trình duyệt.';
    }

    if (error.code === 2 || error.code === error?.POSITION_UNAVAILABLE) {
        return 'Không thể xác định vị trí hiện tại.';
    }

    if (error.code === 3 || error.code === error?.TIMEOUT) {
        return 'Lấy vị trí quá lâu. Hãy thử lại.';
    }

    return error.message || 'Không thể lấy vị trí hiện tại';
};

const API_BASE = process.env.REACT_APP_SERVER || '';

export const fetchPublicNetworkInfo = async () => {
    let serverIp = '';

    try {
        const serverRes = await fetch(`${API_BASE}/api/client-network`, {
            credentials: 'include',
        });

        if (serverRes.ok) {
            const serverData = await serverRes.json();
            serverIp = serverData?.ip || '';
        }
    } catch (error) {
        console.log('fetch server ip error:', error);
    }

    try {
        const response = await fetch('https://ipwho.is/');

        if (!response.ok) {
            throw new Error('Không thể lấy thông tin IP');
        }

        const data = await response.json();

        if (!data?.success) {
            throw new Error(data?.message || 'Không thể lấy thông tin IP');
        }

        return {
            serverIp,
            publicIp: data.ip || serverIp,
            city: data.city || '',
            region: data.region || '',
            country: data.country || '',
            isp: data.connection?.isp || data.isp || '',
            lat: Number(data.latitude) || null,
            lng: Number(data.longitude) || null,
            locationSource: '',
        };
    } catch (error) {
        console.log('fetch public ip error:', error);

        return {
            serverIp,
            publicIp: serverIp,
            city: '',
            region: '',
            country: '',
            isp: '',
            lat: null,
            lng: null,
            locationSource: '',
        };
    }
};

export const buildGeoResultFromIp = (networkInfo) => {
    const locationParts = [networkInfo?.city, networkInfo?.region, networkInfo?.country].filter(Boolean);

    return {
        displayName: locationParts.join(', '),
        address: {
            city: networkInfo?.city,
            state: networkInfo?.region,
            country: networkInfo?.country,
        },
        detail: '',
        provinceCandidates: [networkInfo?.region, networkInfo?.city, networkInfo?.country],
        wardCandidates: [networkInfo?.city],
    };
};

