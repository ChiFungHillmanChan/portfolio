import { lazy } from 'react';
import LoadBalancer from './LoadBalancer';
import AIBasicsStartHere from './AIBasicsStartHere';
import AIScraperDefense from './AIScraperDefense';
import AIVsSoftwareEngineer from './AIVsSoftwareEngineer';
import APIGateway from './APIGateway';
import Authentication from './Authentication';
import BackendRoadmap from './BackendRoadmap';
import CacheInvalidation from './CacheInvalidation';
import CDN from './CDN';
import ChatSystem from './ChatSystem';
import ChessGameDesign from './ChessGameDesign';
import CICDPipeline from './CICDPipeline';
import CodingAgentDesign from './CodingAgentDesign';
import CodingInterview from './CodingInterview';
import DatabaseBasics from './DatabaseBasics';
import DependencyInjection from './DependencyInjection';
import Deployment from './Deployment';
import DistributedCache from './DistributedCache';
import Docker from './Docker';
import FixSlowDatabase from './FixSlowDatabase';
import GitVsGithub from './GitVsGithub';
import InterviewProcess from './InterviewProcess';
import JuniorVsSenior from './JuniorVsSenior';
import KeyValueStore from './KeyValueStore';
import LargeAPIResponse from './LargeAPIResponse';
import LocalhostHosting from './LocalhostHosting';
import MessageQueue from './MessageQueue';
import MetricsLogging from './MetricsLogging';
import Monitoring from './Monitoring';
import NewsFeed from './NewsFeed';
import NotificationSystem from './NotificationSystem';
import ObjectStorage from './ObjectStorage';
import PaymentSystem from './PaymentSystem';
import PickDatabase from './PickDatabase';
import PortForwarding from './PortForwarding';
import PrintVsDebugger from './PrintVsDebugger';
import RateLimiter from './RateLimiter';
import Redis from './Redis';
import References from './References';
import ScaleReads from './ScaleReads';
import ScrapingVsCrawling from './ScrapingVsCrawling';
import SearchAutocomplete from './SearchAutocomplete';
import SecureAIAgents from './SecureAIAgents';
import SelfHostVsCloud from './SelfHostVsCloud';
import ServerVsServerless from './ServerVsServerless';
import SessionManager from './SessionManager';
import StarMethod from './StarMethod';
import SystemDesignPatterns from './SystemDesignPatterns';
import TaskQueue from './TaskQueue';
import UniqueIDGenerator from './UniqueIDGenerator';
import URLShortener from './URLShortener';
import VideoStreaming from './VideoStreaming';
import WebCrawler from './WebCrawler';

// New topics — Batch 1 (14 topics)
import CapTheorem from './CapTheorem';
import CircuitBreaker from './CircuitBreaker';
import DataModeling from './DataModeling';
import DatabaseReplication from './DatabaseReplication';
import DatabaseSharding from './DatabaseSharding';
import DdosProtection from './DdosProtection';
import DisasterRecovery from './DisasterRecovery';
import DistributedTransactions from './DistributedTransactions';
import DnsDeepDive from './DnsDeepDive';
import FileStorageSystem from './FileStorageSystem';
import GrpcVsRest from './GrpcVsRest';
import NotificationPush from './NotificationPush';
import TicketBooking from './TicketBooking';
import WebsocketVsSse from './WebsocketVsSse';
import TimeSeriesDb from './TimeSeriesDb';
import TwelveFactorApp from './TwelveFactorApp';
import RecommendationSystem from './RecommendationSystem';
import ServiceDiscovery from './ServiceDiscovery';
import ReverseProxy from './ReverseProxy';
import ConsensusAlgorithms from './ConsensusAlgorithms';
import LocationService from './LocationService';
import IdempotencyPatterns from './IdempotencyPatterns';
import EmailSystem from './EmailSystem';
import MicroservicesVsMonolith from './MicroservicesVsMonolith';
import ApiDesign from './ApiDesign';
import TestingStrategy from './TestingStrategy';
import OauthSso from './OauthSso';

// Free AI-core topics — static imports (always in main bundle)
import AIToolsLandscape from './AIToolsLandscape';
import AIModelComparison from './AIModelComparison';

// Premium AI-core topics — lazy imports (code-split into separate chunks).
// These chunks are only fetched when the component renders, so non-premium
// users never download the content. Combined with the page-level gate in
// TopicPage.jsx, the content is not accessible via DevTools.
const PromptEngineering = lazy(() => import('./PromptEngineering'));
const PromptCheatSheet = lazy(() => import('./PromptCheatSheet'));
const SkillVsAgent = lazy(() => import('./SkillVsAgent'));
const ContextRotSolution = lazy(() => import('./ContextRotSolution'));
const SDDSpecDrivenDevelopment = lazy(() => import('./SDDSpecDrivenDevelopment'));
const APITokenSecurity = lazy(() => import('./APITokenSecurity'));
const MultiAIWorkflow = lazy(() => import('./MultiAIWorkflow'));
const AIEvaluationLoop = lazy(() => import('./AIEvaluationLoop'));
const MCPProtocol = lazy(() => import('./MCPProtocol'));
const AIIdeaGeneration = lazy(() => import('./AIIdeaGeneration'));
const ClaudeSkillsBuilding = lazy(() => import('./ClaudeSkillsBuilding'));
const MockDesign = lazy(() => import('./MockDesign'));
const OpenSourceAI = lazy(() => import('./OpenSourceAI'));

const topicComponents = {
  'load-balancer': LoadBalancer,
  'ai-basics-start-here': AIBasicsStartHere,
  'ai-tools-landscape': AIToolsLandscape,
  'ai-model-comparison': AIModelComparison,
  'prompt-engineering': PromptEngineering,
  'prompt-cheat-sheet': PromptCheatSheet,
  'skill-vs-agent': SkillVsAgent,
  'context-rot-solution': ContextRotSolution,
  'sdd-spec-driven-development': SDDSpecDrivenDevelopment,
  'api-token-security': APITokenSecurity,
  'multi-ai-workflow': MultiAIWorkflow,
  'ai-evaluation-loop': AIEvaluationLoop,
  'mcp-protocol': MCPProtocol,
  'ai-idea-generation': AIIdeaGeneration,
  'claude-skills-building': ClaudeSkillsBuilding,
  'mock-design': MockDesign,
  'open-source-ai': OpenSourceAI,
  'ai-scraper-defense': AIScraperDefense,
  'ai-vs-software-engineer': AIVsSoftwareEngineer,
  'api-gateway': APIGateway,
  'authentication': Authentication,
  'backend-roadmap': BackendRoadmap,
  'cache-invalidation': CacheInvalidation,
  'cdn': CDN,
  'chat-system': ChatSystem,
  'chess-game-design': ChessGameDesign,
  'cicd-pipeline': CICDPipeline,
  'coding-agent-design': CodingAgentDesign,
  'coding-interview': CodingInterview,
  'database-basics': DatabaseBasics,
  'dependency-injection': DependencyInjection,
  'deployment': Deployment,
  'distributed-cache': DistributedCache,
  'docker': Docker,
  'fix-slow-database': FixSlowDatabase,
  'git-vs-github': GitVsGithub,
  'interview-process': InterviewProcess,
  'junior-vs-senior': JuniorVsSenior,
  'key-value-store': KeyValueStore,
  'large-api-response': LargeAPIResponse,
  'localhost-hosting': LocalhostHosting,
  'message-queue': MessageQueue,
  'metrics-logging': MetricsLogging,
  'monitoring': Monitoring,
  'news-feed': NewsFeed,
  'notification-system': NotificationSystem,
  'object-storage': ObjectStorage,
  'payment-system': PaymentSystem,
  'pick-database': PickDatabase,
  'port-forwarding': PortForwarding,
  'print-vs-debugger': PrintVsDebugger,
  'rate-limiter': RateLimiter,
  'redis': Redis,
  'references': References,
  'scale-reads': ScaleReads,
  'scraping-vs-crawling': ScrapingVsCrawling,
  'search-autocomplete': SearchAutocomplete,
  'secure-ai-agents': SecureAIAgents,
  'self-host-vs-cloud': SelfHostVsCloud,
  'server-vs-serverless': ServerVsServerless,
  'session-manager': SessionManager,
  'star-method': StarMethod,
  'system-design-patterns': SystemDesignPatterns,
  'task-queue': TaskQueue,
  'unique-id-generator': UniqueIDGenerator,
  'url-shortener': URLShortener,
  'video-streaming': VideoStreaming,
  'web-crawler': WebCrawler,

  // New topics — Batch 1
  'cap-theorem': CapTheorem,
  'circuit-breaker': CircuitBreaker,
  'data-modeling': DataModeling,
  'database-replication': DatabaseReplication,
  'database-sharding': DatabaseSharding,
  'ddos-protection': DdosProtection,
  'disaster-recovery': DisasterRecovery,
  'distributed-transactions': DistributedTransactions,
  'dns-deep-dive': DnsDeepDive,
  'file-storage-system': FileStorageSystem,
  'grpc-vs-rest': GrpcVsRest,
  'notification-push': NotificationPush,
  'ticket-booking': TicketBooking,
  'websocket-vs-sse': WebsocketVsSse,
  'time-series-db': TimeSeriesDb,
  'twelve-factor-app': TwelveFactorApp,
  'recommendation-system': RecommendationSystem,
  'service-discovery': ServiceDiscovery,
  'reverse-proxy': ReverseProxy,
  'consensus-algorithms': ConsensusAlgorithms,
  'location-service': LocationService,
  'idempotency-patterns': IdempotencyPatterns,
  'email-system': EmailSystem,
  'microservices-vs-monolith': MicroservicesVsMonolith,
  'api-design': ApiDesign,
  'testing-strategy': TestingStrategy,
  'oauth-sso': OauthSso,
};

export default topicComponents;
