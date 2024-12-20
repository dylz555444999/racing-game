// Import Three.js
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
try {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
} catch (error) {
    console.error("Renderer initialization error:", error);
    alert("Failed to initialize the renderer.");
}

// Resize handler for fullscreen
window.addEventListener('resize', () => {
    try {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    } catch (error) {
        console.error("Resize error:", error);
    }
});

document.body.style.margin = 0;
document.body.style.overflow = 'hidden';

// Lighting
try {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
} catch (error) {
    console.error("Lighting setup error:", error);
}

// Generate floor/grass (checkered pattern)
const floorSize = 50;
const squareSize = 1;
const floorGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
const lightGreenMaterial = new THREE.MeshBasicMaterial({ color: 0x8fbc8f });
const darkGreenMaterial = new THREE.MeshBasicMaterial({ color: 0x2e8b57 });

try {
    for (let x = -floorSize / 2; x < floorSize / 2; x++) {
        for (let z = -floorSize / 2; z < floorSize / 2; z++) {
            const material = (x + z) % 2 === 0 ? lightGreenMaterial : darkGreenMaterial;
            const square = new THREE.Mesh(floorGeometry, material);
            square.position.set(x * squareSize, 0, z * squareSize);
            square.rotation.x = -Math.PI / 2;
            scene.add(square);
        }
    }
} catch (error) {
    console.error("Floor generation error:", error);
}

// Map data for walls
const walls = [
    { start: { x: -5, z: -5 }, end: { x: 5, z: -5 } },
    { start: { x: 5, z: -5 }, end: { x: 5, z: 5 } },
    { start: { x: 5, z: 5 }, end: { x: -5, z: 5 } },
    { start: { x: -5, z: 5 }, end: { x: -5, z: -5 } },
];

// Function to create wall
const createWall = (start, end) => {
    try {
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const wallGeometry = new THREE.BoxGeometry(length, 1, 0.5);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);

        wall.position.set((start.x + end.x) / 2, 0.5, (start.z + end.z) / 2);
        wall.rotation.y = -angle;
        scene.add(wall);
    } catch (error) {
        console.error("Wall creation error:", error);
    }
};

// Generate walls
try {
    walls.forEach(wall => createWall(wall.start, wall.end));
} catch (error) {
    console.error("Wall generation error:", error);
}

// Players and cars
const players = {};
const carColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00];
const carGeometry = new THREE.BoxGeometry(0.5, 0.3, 1);

const createCar = (id, color) => {
    try {
        const carMaterial = new THREE.MeshStandardMaterial({ color });
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.set(0, 0.15, 0);
        scene.add(car);
        players[id] = { car, name: "" };
    } catch (error) {
        console.error(`Car creation error for player ${id}:`, error);
    }
};

// Firebase setup for game hosting/joining
let gameId = null;
const playerName = prompt("Enter your name:") || "Player";
const joinOrHost = prompt("Type 'host' to host a game or enter a game code to join:");

if (joinOrHost?.toLowerCase() === 'host') {
    try {
        gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        set(ref(database, `games/${gameId}`), { host: playerName, players: {} })
            .then(() => alert(`Game hosted! Your game code is: ${gameId}`))
            .catch(error => {
                console.error("Error hosting game:", error);
                alert("Failed to host the game.");
            });
    } catch (error) {
        console.error("Game hosting error:", error);
    }
} else {
    try {
        gameId = joinOrHost?.toUpperCase();
        if (!gameId) throw new Error("Invalid game code.");

        onValue(ref(database, `games/${gameId}`), snapshot => {
            const gameData = snapshot.val();
            if (gameData) {
                Object.keys(gameData.players || {}).forEach(id => {
                    if (!players[id]) {
                        createCar(id, carColors[Object.keys(players).length % carColors.length]);
                    }
                });
            } else {
                console.warn("Game data not found.");
            }
        }, error => {
            console.error("Error fetching game data:", error);
            alert("Failed to join the game.");
        });
        alert(`Joined game with code: ${gameId}`);
    } catch (error) {
        console.error("Game joining error:", error);
    }
}

// Add player to game
const playerId = Math.random().toString(36).substring(2, 10);
try {
    createCar(playerId, carColors[Object.keys(players).length % carColors.length]);
    set(ref(database, `games/${gameId}/players/${playerId}`), { name: playerName, x: 0, z: 0 })
        .catch(error => {
            console.error("Error adding player to game:", error);
            alert("Failed to add player to the game.");
        });
} catch (error) {
    console.error("Player addition error:", error);
}

// Camera position
try {
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
} catch (error) {
    console.error("Camera setup error:", error);
}

// Animation loop
const animate = () => {
    try {
        requestAnimationFrame(animate);

        // Update player positions from Firebase
        onValue(ref(database, `games/${gameId}/players`), snapshot => {
            const playerData = snapshot.val();
            if (playerData) {
                Object.keys(playerData).forEach(id => {
                    if (players[id]) {
                        players[id].car.position.x = playerData[id].x;
                        players[id].car.position.z = playerData[id].z;
                    }
                });
            }
        });

        renderer.render(scene, camera);
    } catch (error) {
        console.error("Animation loop error:", error);
    }
};

animate();
