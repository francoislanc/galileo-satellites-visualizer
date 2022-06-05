import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		vite: {
			ssr: {
				noExternal: ['three']
			}
		}
	}
};

export default config;
