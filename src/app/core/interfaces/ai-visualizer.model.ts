/** Mirrors the backend's VisualizeEventResponseDto (AiController POST /api/ai/visualize). */
export interface VisualizeEventResponse {
  originalImageUrl: string;
  generatedImageUrl: string;
  prompt: string;
}
