<script>
	import {
		MeshStandardMaterial,
		MeshBasicMaterial,
		MeshPhongMaterial,
		SphereGeometry,
		DoubleSide,
		BackSide,
		Euler
	} from 'three';
	import { DEG2RAD } from 'three/src/math/MathUtils';
	import {
		GLTF,
		AmbientLight,
		Canvas,
		DirectionalLight,
		Group,
		Mesh,
		OrbitControls,
		PerspectiveCamera,
		useTexture
	} from 'threlte';
	import { onDestroy, onMount } from 'svelte';
	import {
		twoline2satrec,
		propagate,
		gstime,
		eciToGeodetic,
		degreesLong,
		degreesLat
	} from 'satellite.js';
	import { dev } from '$app/env';

	const textureEarth = useTexture('8081_earthmap2k.jpg', {
		onError: (error) => {
			console.warn(`An error occured loading the texture: ${error.message}`);
		}
	});
	const textureEarthBump = useTexture('8081_earthbump2k.jpg', {
		onError: (error) => {
			console.warn(`An error occured loading the texture: ${error.message}`);
		}
	});
	const textureEarthSpec = useTexture('8081_earthspec2k.jpg', {
		onError: (error) => {
			console.warn(`An error occured loading the texture: ${error.message}`);
		}
	});
	const textureCloud = useTexture('cloud_texture.png', {
		onError: (error) => {
			console.warn(`An error occured loading the texture: ${error.message}`);
		}
	});
	const textureStarfield = useTexture('galaxy_starfield.png', {
		onError: (error) => {
			console.warn(`An error occured loading the texture: ${error.message}`);
		}
	});

	let rotY = 0.0;

	// src : https://www.celestrak.com/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle
	import galileoSatellites from '../../static/tle/galileo.json?raw';
	import { base } from '$app/paths';

	let satellitesJson = JSON.parse(galileoSatellites);
	async function rotateCloud() {
		rotY += 1 / 256;
	}

	const intervalCloudUpdate = setInterval(async () => {
		rotateCloud();
	}, 100);
	const intervalObjectsUpdate = setInterval(async () => {
		fetchObjects();
	}, 5000);
	const earthRadius = 2;

	onMount(async () => {
		fetchObjects();
	});

	onDestroy(() => {
		clearInterval(intervalCloudUpdate);
		clearInterval(intervalObjectsUpdate);
	});

	function subtractMinutes(numOfMinutes, date = new Date()) {
		const dateCopy = new Date(date.getTime());
		dateCopy.setMinutes(dateCopy.getMinutes() - numOfMinutes);
		return dateCopy;
	}

	let satellites = Array();
	let indexSelectedSatellites = null;
	let predLength = 10;

	async function fetchObjects() {
		let now = new Date();
		let satellitesN = [];
		for (const s of satellitesJson) {
			if (s.operational) {
				const lines = s.tle.split('\n');
				let satrec = twoline2satrec(lines[0], lines[1]);

				let posPreds = [];
				for (let i = -predLength; i <= predLength; i++) {
					let time = subtractMinutes(i * 4, now);
					let gmst = gstime(time);
					let positionAndVelocity = propagate(satrec, time);
					let positionGd = eciToGeodetic(positionAndVelocity.position, gmst);
					let longitude = degreesLong(positionGd.longitude),
						latitude = degreesLat(positionGd.latitude);
					let pos = getPos(latitude, longitude, earthRadius + 0.1);
					posPreds.push({ ...pos, time: time });
				}
				s.pos = posPreds;
				satellitesN.push({ ...s });
			}
		}
		satellites = satellitesN;
	}

	function getPos(lat, lon, radius) {
		let phi = (90 - lat) * (Math.PI / 180);
		let theta = (lon + 180) * (Math.PI / 180);

		let x = -(radius * Math.sin(phi) * Math.cos(theta));
		let z = radius * Math.sin(phi) * Math.sin(theta);
		let y = radius * Math.cos(phi);

		return { x: x, y: y, z: z, phi: phi, theta: theta, lat: lat, lon: lon };
	}

	function getScale(indexSelectedSatellites, _id) {
		if (indexSelectedSatellites != null) {
			if (satellites[indexSelectedSatellites].id == _id) {
				return 0.7;
			}
		}
		return 0.5;
	}

	function getColor(id) {
		if (id > predLength) {
			return '#000099';
		} else {
			return '#6600cc';
		}
	}

	function getModelUrl() {
		if (dev) {
			return '/models/galileo.glb';
		} else {
			return `${base}/models/galileo.glb`;
		}
	}
</script>

<svelte:head>
	<title>Visualize Galileo satellites in orbit</title>
	<html lang="en" /></svelte:head
>
<div id="earth" style="position: relative; display: inline-block;">
	<Canvas>
		<PerspectiveCamera position={{ x: 10, y: 10, z: 10 }} fov={32}>
			<OrbitControls
				maxPolarAngle={DEG2RAD * 180}
				minDistance={5}
				maxDistance={10}
				autoRotate={false}
				enableZoom={true}
				target={{ y: 0.5 }}
			/>
		</PerspectiveCamera>

		<DirectionalLight shadow position={{ x: 3, y: 10, z: 10 }} />
		<DirectionalLight position={{ x: -3, y: 10, z: -10 }} intensity={0.2} />
		<AmbientLight intensity={0.2} />

		<Group>
			<Mesh
				geometry={new SphereGeometry(earthRadius)}
				material={new MeshPhongMaterial({
					map: textureEarth,
					bumpMap: textureEarthBump,
					bumpScale: 0.05,
					specularMap: textureEarthSpec,
					specular: '#111111'
				})}
			/>
			<Mesh
				ignorePointer
				rotation={{ y: rotY }}
				geometry={new SphereGeometry(earthRadius + 0.05)}
				material={new MeshPhongMaterial({
					map: textureCloud,
					opacity: 0.8,
					transparent: true,
					depthWrite: false,
					side: DoubleSide
				})}
			/>
		</Group>

		<Mesh
			receiveShadow
			geometry={new SphereGeometry(10, 32, 32)}
			material={new MeshStandardMaterial({ side: BackSide, map: textureStarfield })}
		/>

		{#each satellites as s, i}
			{#if s.pos != null}
				<GLTF
					scale={getScale(indexSelectedSatellites, s.id)}
					url={getModelUrl()}
					position={{ x: s.pos[predLength].x, y: s.pos[predLength].y, z: s.pos[predLength].z }}
					rotation={new Euler(0, s.pos[predLength].theta, s.pos[predLength].phi)}
					interactive
					on:click={() => {
						indexSelectedSatellites = i;
					}}
				/>
			{/if}
		{/each}

		{#if indexSelectedSatellites != null}
			{#each satellites[indexSelectedSatellites].pos as p, i}
				<Mesh
					receiveShadow
					geometry={new SphereGeometry(0.005, 32, 32)}
					position={{ x: p.x, y: p.y, z: p.z }}
					material={new MeshBasicMaterial({ color: getColor(i), transparent: true, opacity: 0.5 })}
				/>
			{/each}
		{/if}
	</Canvas>

	{#if indexSelectedSatellites != null}
		<div
			style="position: absolute; left: 1em; top: 1em; color: white; background-color: rgba(255, 255, 255, .4); padding: 20px;"
		>
			<h3>
				{satellites[indexSelectedSatellites].id} - {satellites[indexSelectedSatellites].nickname}
			</h3>
			<table>
				<tr>
					<td>lat</td>
					<td
						>{Number.parseFloat(satellites[indexSelectedSatellites].pos[predLength].lat).toFixed(
							4
						)}</td
					>
				</tr>
				<tr>
					<td>lon</td>
					<td
						>{Number.parseFloat(satellites[indexSelectedSatellites].pos[predLength].lon).toFixed(
							4
						)}</td
					>
				</tr>
			</table>
		</div>
	{/if}
</div>

<style>
	#earth {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
	h3 {
		text-align: center;
		padding-bottom: 20px;
	}
	table {
		border-spacing: 10px;
	}
</style>
