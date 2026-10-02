import { QuizQuestion } from '../types/index.ts';

export const heroQuizQuestions: QuizQuestion[] = [
  {
    id: 'hero-q1',
    domain: 'cs',
    domainName: 'Computer Science',
    difficulty: 'Intermediate',
    question: 'What is the time complexity of finding a cycle in a directed graph using Kahn’s Algorithm (Topological Sort)?',
    codeSnippet: `// Kahn's Algorithm check
function hasCycle(V, adj) {
  let inDegree = new Array(V).fill(0);
  // Calculate in-degrees & process queue
  // If processedCount !== V -> Cycle detected!
}`,
    options: [
      'O(V · E)',
      'O(V + E)',
      'O(V log V)',
      'O(E²)'
    ],
    correctIndex: 1,
    explanation: 'Kahn\'s algorithm traverses each vertex once and decrements in-degrees along each edge once, yielding a linear O(V + E) time complexity.',
    hint: 'Think about how many times each vertex and edge are processed when tracking in-degrees.',
    xpReward: 120
  },
  {
    id: 'hero-q2',
    domain: 'ai',
    domainName: 'AI & Deep Learning',
    difficulty: 'Intermediate',
    question: 'In Transformer architectures, what is the primary computational bottleneck when scaling sequence length L in standard multi-head self-attention?',
    codeSnippet: `Attention(Q, K, V) = softmax((Q · K^T) / sqrt(d_k)) · V
// Where Q, K, V are matrices of shape (L × d_k)`,
    options: [
      'Linear O(L · d_k) memory bottleneck',
      'Quadratic O(L²) memory & compute cost',
      'Exponential O(2^L) token projection cost',
      'Logarithmic O(log L) cache lookups'
    ],
    correctIndex: 1,
    explanation: 'Computing the product (Q · K^T) results in an L × L attention matrix, leading to quadratic O(L²) memory and computation requirements with respect to context length.',
    hint: 'Consider the matrix multiplication of Q (L × d) and K^T (d × L).',
    xpReward: 150
  },
  {
    id: 'hero-q3',
    domain: 'ee',
    domainName: 'Electrical Engineering',
    difficulty: 'Advanced',
    question: 'In a CMOS inverter circuit, which phenomenon primarily causes short-circuit dynamic power dissipation during switching?',
    codeSnippet: `Vin: 0V ----> VDD
NMOS: OFF --> ON
PMOS: ON  --> OFF
// Transition moment: both briefly conducting!`,
    options: [
      'Parasitic junction capacitance leakage to ground',
      'Simultaneous conduction of NMOS and PMOS during input transition',
      'Subthreshold drain-source punch-through leakage',
      'Inductive kickback from bond-wire parasitic inductance'
    ],
    correctIndex: 1,
    explanation: 'During input voltage switching (around VDD/2), both NMOS and PMOS transistors are momentarily saturated and conducting simultaneously, causing a direct current path from VDD to ground.',
    hint: 'Look closely at the overlap state where Vin is midway between logic 0 and logic 1.',
    xpReward: 180
  },
  {
    id: 'hero-q4',
    domain: 'mech',
    domainName: 'Mechanical & Aerospace',
    difficulty: 'Advanced',
    question: 'According to Bernoulli’s equation for incompressible, frictionless flow, if flow velocity increases through a Venturi constriction, what happens to the static pressure?',
    options: [
      'Static pressure increases proportionally to v²',
      'Static pressure remains unchanged while dynamic pressure drops',
      'Static pressure decreases to balance total head pressure',
      'Static pressure drops to absolute vacuum instantaneously'
    ],
    correctIndex: 2,
    explanation: 'By Bernoulli’s conservation law (P + ½ρv² + ρgh = constant), as kinetic energy density (½ρv²) rises due to constriction, static pressure P must decrease.',
    hint: 'Total mechanical energy in the streamline is conserved.',
    xpReward: 160
  }
];

export const sampleDomainQuestions: Record<string, QuizQuestion> = {
  'computer-science': {
    id: 'dom-cs',
    domain: 'cs',
    domainName: 'Computer Systems & OS',
    difficulty: 'Advanced',
    question: 'Which CPU scheduling algorithm can lead to the "convoy effect" where short processes wait behind one long CPU-bound process?',
    codeSnippet: `Queue: [P1 (Burst: 100ms), P2 (Burst: 2ms), P3 (Burst: 1ms)]`,
    options: [
      'First-Come, First-Served (FCFS)',
      'Shortest Remaining Time First (SRTF)',
      'Round Robin with 10ms quantum',
      'Multi-Level Feedback Queue (MLFQ)'
    ],
    correctIndex: 0,
    explanation: 'FCFS non-preemptive scheduling executes whatever arrives first, causing short I/O-bound processes to stall behind a massive compute task (the Convoy Effect).',
    hint: 'Non-preemptive first-in queue.',
    xpReward: 140
  },
  'ai-machine-learning': {
    id: 'dom-ai',
    domain: 'ai',
    domainName: 'AI & Neural Systems',
    difficulty: 'Intermediate',
    question: 'Why is the GELU (Gaussian Error Linear Unit) activation preferred over standard ReLU in modern LLMs like GPT & BERT?',
    options: [
      'It has zero computation cost compared to ReLU',
      'It provides smooth probabilistic gating and avoids the "dying neuron" dead gradient zone',
      'It guarantees strict output bounded strictly between -1 and +1',
      'It eliminates the need for matrix normalization layers'
    ],
    correctIndex: 1,
    explanation: 'GELU weights inputs by their probability under normal distribution, creating a smooth differentiable curve that retains non-zero gradients even for slight negative activations.',
    hint: 'Think of smooth stochastic regularization vs sharp clipping at zero.',
    xpReward: 160
  },
  'electrical-embedded': {
    id: 'dom-ee',
    domain: 'ee',
    domainName: 'Embedded & VLSI',
    difficulty: 'Master',
    question: 'In high-speed PCB differential signaling (e.g., PCIe / USB 3.0), why are trace pairs closely coupled and matched in electrical length?',
    options: [
      'To double the transmitted voltage swing amplitude',
      'To minimize common-mode noise radiation and eliminate phase skew between D+ and D-',
      'To prevent DC ground loops from overheating the IC substrate',
      'To allow single-ended termination without pull-up resistors'
    ],
    correctIndex: 1,
    explanation: 'Differential signaling relies on common-mode noise rejection. Length-matching eliminates timing skew, while close coupling ensures any external EMI affects both traces equally and cancels out.',
    hint: 'Differential receivers subtract the signals: V_out = V+ - V-.',
    xpReward: 200
  },
  'robotics-mechatronics': {
    id: 'dom-mech',
    domain: 'mech',
    domainName: 'Robotics & Control Systems',
    difficulty: 'Intermediate',
    question: 'In a PID controller, what is the primary risk of setting the Integral gain (Ki) too high?',
    options: [
      'Permanent steady-state offset error',
      'Severe overshoot, oscillation, and integrator windup',
      'Sluggish response to rapid setpoint steps',
      'Excessive high-frequency sensor noise amplification'
    ],
    correctIndex: 1,
    explanation: 'High integral gain accumulates past errors excessively, resulting in "integrator windup", prolonged oscillations, and potential closed-loop instability.',
    hint: 'Integral term sums cumulative error over time.',
    xpReward: 150
  },
  'cloud-devops': {
    id: 'dom-cloud',
    domain: 'cloud',
    domainName: 'Cloud & Distributed Systems',
    difficulty: 'Advanced',
    question: 'According to the CAP theorem in distributed data stores, during an inevitable network partition (P), what trade-off must be chosen?',
    options: [
      'Throughput vs Latency',
      'Consistency (linearizability) vs Availability (every non-failing node returns a response)',
      'Security encryption vs Compression speed',
      'ACID transactions vs Master-slave replication'
    ],
    correctIndex: 1,
    explanation: 'When a network partition occurs, a distributed system must decide whether to continue serving potentially stale data (Availability) or reject requests until sync is verified (Consistency).',
    hint: 'Can all nodes answer simultaneously with guaranteed identical state across broken connections?',
    xpReward: 175
  },
  'quantum-computing': {
    id: 'dom-quantum',
    domain: 'quantum',
    domainName: 'Quantum Information',
    difficulty: 'Master',
    question: 'Which quantum gate creates an equal superposition state from a computational basis state |0⟩?',
    options: [
      'Pauli-X Gate (NOT)',
      'Hadamard Gate (H)',
      'Controlled-NOT (CNOT)',
      'Phase Gate (S)'
    ],
    correctIndex: 1,
    explanation: 'The Hadamard gate maps |0⟩ to (|0⟩ + |1⟩)/√2, placing the qubit in a coherent equal superposition.',
    hint: 'The most fundamental single-qubit superposition operator.',
    xpReward: 220
  }
};
