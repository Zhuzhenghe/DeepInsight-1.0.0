/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'onnxruntime-node', '@xenova/transformers'],
  },
  webpack: (config, { isServer }) => {
    // 排除 ONNX Runtime 的二进制文件
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        '@xenova/transformers': 'commonjs @xenova/transformers'
      });
    }
    
    // 忽略二进制文件
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });

    return config;
  },
};

export default nextConfig;
