import { GoogleGenAI } from "@google/genai";

export const MODELS = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3.0 Flash',
    desc: 'Tốc độ cao, độ trễ thấp (Khuyên dùng)',
    priority: 1
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3.0 Pro',
    desc: 'Xử lý tác vụ phức tạp tốt hơn',
    priority: 2
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    desc: 'Model ổn định thế hệ trước',
    priority: 3
  }
];

const SYSTEM_INSTRUCTION = `Bạn là một trợ lý biên tập văn bản Tiếng Việt chuyên nghiệp. Nhiệm vụ của bạn là chuẩn hóa văn bản đầu vào theo các quy tắc sau:

1. Sửa lỗi chính tả tiếng Việt:
   - Tự động phát hiện và sửa các lỗi chính tả phổ biến (ví dụ: sa/xa, s/x, tr/ch, d/gi/r, dấu hỏi/ngã).
   - Sửa lỗi dấu thanh (đặt sai vị trí dấu).
   - Sửa lỗi thiếu/thừa ký tự trong từ.
   - Sửa lỗi sai phụ âm đầu, vần, phụ âm cuối.

2. Sửa lỗi viết hoa:
   - Viết hoa chữ cái đầu câu.
   - Viết thường các từ bị viết hoa sai (ví dụ: "KHông" -> "không", "BÁO CÁO" -> "Báo cáo" trừ khi là tiêu đề).
   - GIỮ NGUYÊN tên riêng, địa danh, tên viết tắt (UBND, THPT, v.v.).

3. Chuẩn hóa Bullet Points:
   - Chuyển các ký tự đặc biệt (•, ●, -, +) đầu dòng thành gạch đầu dòng chuẩn "- ".
   - Nếu là ý nhỏ hơn (cấp 2), sử dụng "+ ".

4. Định dạng:
   - Giữ nguyên cấu trúc đoạn văn.
   - Xóa khoảng trắng thừa.

CHỈ TRẢ VỀ KẾT QUẢ VĂN BẢN ĐÃ SỬA, KHÔNG KÈM LỜI DẪN HAY GIẢI THÍCH.`;

export const fixTextWithAI = async (
  text: string,
  apiKey: string,
  preferredModelId: string = 'gemini-3-flash-preview'
): Promise<{ text: string; modelUsed: string }> => {
  if (!apiKey) throw new Error("Chưa có API Key");

  // Sắp xếp danh sách model: Ưu tiên model người dùng chọn, sau đó đến các model khác theo thứ tự
  const modelQueue = [
    preferredModelId,
    ...MODELS.map(m => m.id).filter(id => id !== preferredModelId)
  ];

  let lastError: any = null;

  for (const modelId of modelQueue) {
    try {
      console.log(`Đang thử model: ${modelId}`);
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: modelId,
        contents: text,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const resultText = response.text;
      if (resultText) {
        return { text: resultText.trim(), modelUsed: modelId };
      }
    } catch (error: any) {
      console.warn(`Model ${modelId} thất bại:`, error);
      lastError = error;
      // Tiếp tục vòng lặp để thử model tiếp theo
    }
  }

  // Nếu chạy hết vòng lặp mà không return -> Thất bại toàn tập
  throw lastError || new Error("Không thể xử lý văn bản với bất kỳ model nào.");
};