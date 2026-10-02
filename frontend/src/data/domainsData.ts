import { DomainCategory } from '../types/index.ts';
import { sampleDomainQuestions } from './quizData.ts';

export const domainCategories: DomainCategory[] = [
  {
    id: 'computer-science',
    name: 'Computer Systems & Architecture',
    slug: 'computer-science',
    icon: 'Laptop',
    accentColor: '#4f46e5',
    badge: 'Popular Realm',
    description: 'Operating systems, memory hierarchies, cache coherence, CPU pipelines, and concurrency primitives.',
    questionCount: 420,
    activeLearners: '18.4k',
    difficulty: 'Advanced',
    popularTopics: ['Virtual Memory', 'Cache Coherence', 'POSIX Threads', 'TCP/IP Stack', 'B-Trees'],
    sampleQuestion: sampleDomainQuestions['computer-science']
  },
  {
    id: 'ai-machine-learning',
    name: 'AI, Deep Learning & LLMs',
    slug: 'ai-machine-learning',
    icon: 'Brain',
    accentColor: '#06b6d4',
    badge: 'Trending Realm',
    description: 'Attention mechanisms, backpropagation calculus, optimization algorithms, quantization, and RLHF.',
    questionCount: 350,
    activeLearners: '24.1k',
    difficulty: 'Intermediate',
    popularTopics: ['FlashAttention', 'AdamW Math', 'LoRA Fine-tuning', 'Vector Search', 'Diffusion'],
    sampleQuestion: sampleDomainQuestions['ai-machine-learning']
  },
  {
    id: 'electrical-embedded',
    name: 'Embedded Systems & VLSI',
    slug: 'electrical-embedded',
    icon: 'Zap',
    accentColor: '#f59e0b',
    badge: 'Hardware Core',
    description: 'Digital logic, CMOS circuit design, ARM/RISC-V assembly, RTOS interrupts, and FPGA verilog synthesis.',
    questionCount: 290,
    activeLearners: '9.8k',
    difficulty: 'Master',
    popularTopics: ['Static Timing Analysis', 'DMA Controllers', 'SPI & I2C Timing', 'VHDL / Verilog', 'Op-Amps'],
    sampleQuestion: sampleDomainQuestions['electrical-embedded']
  },
  {
    id: 'robotics-mechatronics',
    name: 'Robotics & Control Systems',
    slug: 'robotics-mechatronics',
    icon: 'Bot',
    accentColor: '#10b981',
    badge: 'Autonomous Systems',
    description: 'Forward/inverse kinematics, Kalman filters, PID tuning, ROS2 nodes, and state estimation.',
    questionCount: 240,
    activeLearners: '7.3k',
    difficulty: 'Intermediate',
    popularTopics: ['Extended Kalman Filter', 'Quaternions', 'SLAM Algorithms', 'Path Planning A*', 'Actuators'],
    sampleQuestion: sampleDomainQuestions['robotics-mechatronics']
  },
  {
    id: 'cloud-devops',
    name: 'Cloud & Distributed Systems',
    slug: 'cloud-devops',
    icon: 'Cloud',
    accentColor: '#8b5cf6',
    badge: 'High Scale',
    description: 'Raft consensus, microservices resilience, Kubernetes primitives, distributed caching, and zero-trust.',
    questionCount: 310,
    activeLearners: '14.2k',
    difficulty: 'Advanced',
    popularTopics: ['CAP Theorem', 'Raft Consensus', 'eBPF Observability', 'gRPC Buffers', 'Event Sourcing'],
    sampleQuestion: sampleDomainQuestions['cloud-devops']
  },
  {
    id: 'quantum-computing',
    name: 'Quantum Systems & Physics',
    slug: 'quantum-computing',
    icon: 'Atom',
    accentColor: '#ec4899',
    badge: 'Frontier Tech',
    description: 'Qubits, entanglement, Grover & Shor algorithms, decoherence, and quantum error correction codes.',
    questionCount: 160,
    activeLearners: '4.5k',
    difficulty: 'Master',
    popularTopics: ['Bloch Sphere', 'Qiskit Circuits', 'Bell State Pairs', 'Surface Codes', 'Quantum Teleportation'],
    sampleQuestion: sampleDomainQuestions['quantum-computing']
  }
];
