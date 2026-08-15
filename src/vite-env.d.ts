/// <reference types="vite/client" />

// Pulls in the JSX augmentation that teaches TSX about `<mesh>`, `<sprite>`,
// `<pointsMaterial>` and the rest of the three.js element namespace. Without a
// reference somewhere global, files that only use intrinsic three elements
// would not see it.
import type {} from '@react-three/fiber';
