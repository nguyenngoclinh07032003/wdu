import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { publicRoute } from './Route';
import { Provider } from './store/Provider';
import ProtectedAdminRoute from './Route/ProtectedAdminRoute';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <Provider>
            <Router>
                <Routes>
                    {publicRoute.map((route, index) => {
                        if (route.path === '/admin') {
                            return (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={<ProtectedAdminRoute>{route.element}</ProtectedAdminRoute>}
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
