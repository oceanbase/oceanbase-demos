import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 将 Sequelize 和数据库驱动标记为外部包，避免在构建时打包
  serverExternalPackages: ['sequelize', 'mysql2'],
  
  // Turbopack 配置：将不需要的数据库驱动重定向到空模块
  turbopack: {
    resolveAlias: {
      // 将不需要的数据库驱动重定向到空模块（我们只使用 MySQL）
      'pg': './src/lib/empty-module.ts',
      'pg-hstore': './src/lib/empty-module.ts',
      'pg-native': './src/lib/empty-module.ts',
      'pg-query-stream': './src/lib/empty-module.ts',
      'tedious': './src/lib/empty-module.ts',
      'sqlite3': './src/lib/empty-module.ts',
      'better-sqlite3': './src/lib/empty-module.ts',
      'ibm_db': './src/lib/empty-module.ts',
      'oracledb': './src/lib/empty-module.ts',
    },
  },
  
  // Webpack 配置（作为备用，当使用 --webpack 标志时）
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务器端，将这些模块标记为外部依赖
      const originalExternals = config.externals || [];
      
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }: { request?: string }) => {
          // 排除不需要的数据库驱动
          if (
            request === 'pg' ||
            request === 'pg-hstore' ||
            request === 'tedious' ||
            request === 'sqlite3' ||
            request === 'better-sqlite3' ||
            request === 'ibm_db' ||
            request === 'oracledb'
          ) {
            return true; // 标记为外部依赖，不打包
          }
          return false;
        },
      ];
    }

    // 在客户端忽略这些模块
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pg': false,
      'pg-hstore': false,
      'tedious': false,
      'sqlite3': false,
      'better-sqlite3': false,
      'ibm_db': false,
      'oracledb': false,
    };

    return config;
  },
};

export default nextConfig;
