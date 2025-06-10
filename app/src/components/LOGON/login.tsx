import { ConstantNodeDependencies } from 'mathjs';
import React, { useState } from 'react';
import '../../css/LOGON/login.css'

// Define a interface para o objeto electron exposto no window
// Isso é crucial para a tipagem segura do ipcRenderer

interface LoginPageProps {
    onLoginSuccess: (userId: number) => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const electron = (window as any).electron;
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Usa window.electron.ipcRenderer para chamar o processo principal
            const result: { success: boolean; userId?: number; message?: string } =
                await electron.invoke('login-check',username, password);
                    electron.invoke('set-userid',result.userId);

            if (result.success && result.userId !== undefined) {
                // Login bem-sucedido, obtém o ID do usuário
                const userId: number = result.userId;
           
                console.log('Login bem-sucedido! User ID:', userId);
                onLoginSuccess(userId); // Chama a função de callback com o ID
            } else {
                setError(result.message || 'Nome de usuário ou senha incorretos.');
            }
        } catch (err) {
            console.error('Erro ao fazer login:', err);
            setError('Ocorreu um erro ao tentar fazer login. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Usuário:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Senha:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;