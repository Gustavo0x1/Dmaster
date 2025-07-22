// src/AppRouterAndAuth.tsx
import React, { useState } from 'react';
import { Route, Routes, HashRouter } from 'react-router-dom';

// Importe seus componentes
import { Layout } from './components/Layout';
import { Inventory } from './components/Inventory/Inventory';
import AudioMng  from './components/AUDIO/AudioControlTab';
import { Actions } from './pages/Actions';
import RPGGrid from './components/MainGrids'; // Adicionei este pois estava no seu index.tsx original
import FullCharSheet from './components/CharacterSheet/CharacterSheetManager';
import Home from './pages/Home';
import LoginPage from './components/LOGON/login';

// Importe seus CSS (se eles se aplicam a todo o aplicativo)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './css/CharSheet/CharSheet.css';
import './index.css'; // Mantenha este se ele tiver estilos globais para o aplicativo
import Fichas from './pages/Fichas';

// Define a interface para o objeto electron exposto no window
// Isso é crucial para a tipagem segura do ipcRenderer
declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                invoke: (channel: string, data?: any) => Promise<any>;
                send: (channel: string, data?: any) => void;
                on: (channel: string, func: (...args: any[]) => void) => void;
                once: (channel: string, func: (...args: any[]) => void) => void;
            };
        };
    }
}

function AppRouterAndAuth() {
    const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

    const handleLoginSuccess = (userId: number) => {
        setLoggedInUserId(userId);
        console.log('Usuário logado com sucesso! ID:', userId);
    };

    return (
        <>
            {/* A tag meta de Content-Security-Policy geralmente vai no public/index.html */}
            {/* Se você precisar dela aqui por algum motivo específico do Electron, certifique-se de que é a forma correta para o Electron */}

            <HashRouter basename="/">
                <Routes>
                    {/* Rota para a página de login. Ela será sempre acessível, mas
                        se o usuário já estiver logado, pode-se redirecionar programaticamente.
                        Por enquanto, ela é o ponto de entrada principal antes de qualquer outra coisa. */}
                    <Route path='/login' element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />

                    {/*
                        Se o usuário NÃO estiver logado, ele só verá a página de login.
                        Se ele tentar acessar outras rotas, será redirecionado para o login.
                        Isso exige um pouco mais de lógica (ex: um componente PrivateRoute ou redirecionamento no Layout).
                        Por simplicidade, vamos fazer uma verificação básica aqui.
                    */}
                    {loggedInUserId ? (
                        // Rotas acessíveis APÓS o login
                        <Route path="/" element={<Layout />}>
                            {/* Define a rota padrão após o login, ou seja, / */}
                            <Route index element={<Home />} />
                            <Route path='/acoes' element={<Actions />} />
                            <Route path='/ficha' element={<Fichas />} />
                            <Route path='/inventario' element={<Inventory />} />
                            <Route path='/audioMng' element={<AudioMng />} />
                            {/* Você pode adicionar outras rotas como o RPGGrid se ele for parte da aplicação logada */}
                            {/* <Route path='/grid' element={<RPGGrid />} /> */}
                        </Route>
                    ) : (
                        // Se não estiver logado, a única rota válida (além de /login)
                        // seria para garantir que não haja acesso indevido às outras rotas.
                        // Uma abordagem mais robusta seria usar Navigate do react-router-dom para redirecionar.
                        // Por exemplo, você pode ter uma rota Catch-all que redireciona para /login.
                        <Route path="*" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                    )}
                </Routes>
            </HashRouter>
        </>
    );
}

export default AppRouterAndAuth;