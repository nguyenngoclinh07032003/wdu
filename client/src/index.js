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

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <Provider>
            <Router>
                <Routes>
                    {publicRoute.map((route, index) => {
                        // Chặn admin
                        if (route.path === '/admin') {
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

                        return <Route key={index} path={route.path} element={route.element} />;
                    })}
                </Routes>
            </Router>
        </Provider>
    </React.StrictMode>,
);

reportWebVitals();
