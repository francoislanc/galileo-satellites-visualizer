import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist'
		}),
		paths: {
			base: dev ? '' : '/galileo-satellites-visualizer'
		},
		vite: {
			ssr: {
				noExternal: ['three']
			}
		},
		prerender: {
			default: true
		}
	}
};

export default config;
