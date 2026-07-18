import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { publicRoute } from './Route';
import { Provider } from './store/Provider';
import ProtectedAdminRoute from '../../client/src/Route/ProtectedAdminRoute';
import ProtectedStaffRoute from '../../client/src/Route/ProtectedStaffRoute';
import ProtectedDoctorRoute from '../../client/src/Route/ProtectedDoctorRoute';
import ProtectedAskerRoute from '../../client/src/Route/ProtectedAskerRoute';
import ProtectedShipperRoute from '../../client/src/Route/ProtectedShipperRoute';
import ProtectedUserRoute from '../../client/src/Route/ProtectedUserRoute';
import ScrollToTop from './Components/ScrollToTop';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <Provider>
            <Router>
                <ScrollToTop />
                <Routes>
                    {publicRoute.map((route, index) => {
                        // Chặn toàn bộ route /admin (kể cả /admin/customer/:id)
                        if (route.path === '/admin' || String(route.path).startsWith('/admin/')) {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedAdminRoute>{route.element}</ProtectedAdminRoute>}
                                />
                            );
                        }

                        if (route.path === '/staff') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedStaffRoute>{route.element}</ProtectedStaffRoute>}
                                />
                            );
                        }

                        if (route.path === '/doctor') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedDoctorRoute>{route.element}</ProtectedDoctorRoute>}
                                />
                            );
                        }

                        if (route.path === '/hoi-bac-si') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedAskerRoute>{route.element}</ProtectedAskerRoute>}
                                />
                            );
                        }

                        if (route.path === '/hoi-nhan-vien') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedAskerRoute>{route.element}</ProtectedAskerRoute>}
                                />
                            );
                        }

                        if (route.path === '/shipper/dashboard') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedShipperRoute>{route.element}</ProtectedShipperRoute>}
                                />
                            );
                        }

                        if (
                            route.path === '/info' ||
                            route.path === '/payments' ||
                            route.path === '/address-book'
                        ) {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedUserRoute>{route.element}</ProtectedUserRoute>}
                                />
                            );
                        }

                        return <Route key={index} path={route.path} element={route.element} />;
                    })}
                </Routes>
            </Router>
        </Provider>
    </React.StrictMode>,
);

reportWebVitals();
