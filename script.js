import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ankanwyqqaatpwizyiyo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Pm-d1pHB55S_sph_uMW-jg_qLvDFuLE";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const quizData = {
  coffee:{business:"Bean There Café",question:"Which ingredient gives a cappuccino its coffee flavour?",answers:["Tea leaves","Espresso coffee","Lemon juice","Cocoa butter"],correct:1,reward:"15% off your next coffee"},
  shopping:{business:"The Good Things Store",question:"Which of these is commonly used to wrap a gift?",answers:["Gift paper","Sand","Cooking oil","Soap"],correct:0,reward:"₹100 off purchases above ₹799"},
  beauty:{business:"Glow Studio",question:"Which of these is commonly used to moisturise skin?",answers:["Sand","Moisturiser","Chalk","Vinegar"],correct:1,reward:"20% off your first appointment"},
  cycle:{business:"Urban Cycle Care",question:"Which part of a bicycle helps it slow down or stop?",answers:["Bell","Brake","Seat","Basket"],correct:1,reward:"10% off your next service"}
};
const quizModal=document.getElementById("quizModal");
const infoModal=document.getElementById("infoModal");
const accountModal=document.getElementById("accountModal");
const businessGrid=document.getElementById("businessGrid");
const searchInput=document.getElementById("searchInput");
const emptyState=document.getElementById("emptyState");
const dashboard=document.getElementById("customerDashboard");
let currentSession=null;
let activeCategory="All",activeView="all",activeQuiz=null,selectedAnswer=null;
const liveQuestions=new Map();


async function loadLiveOffers(){
  const {data,error}=await supabase.from("questions").select("id,prompt,options,reward_type,reward_value,minimum_purchase,ends_at,business_id,businesses(name,category,city)").eq("status","published").lte("starts_at",new Date().toISOString()).gt("ends_at",new Date().toISOString()).order("created_at",{ascending:false});
  if(error){console.warn("Live offers could not be loaded:",error.message);return;}
  const existing=new Set(Array.from(businessGrid.querySelectorAll(".business-card")).map(card=>card.dataset.businessId).filter(Boolean));
  (data||[]).forEach(question=>{
    const business=question.businesses;
    if(!business)return;
    const key=question.id;
    liveQuestions.set(key,{questionId:key,business:business.name,question:question.prompt,answers:Array.isArray(question.options)?question.options:[],reward:question.reward_type==="percentage"?Number(question.reward_value)+"% off": "₹"+Number(question.reward_value).toLocaleString("en-IN")+" off"});
    if(existing.has(business.name+"-"+key))return;
    const category=business.category||"Other";
    const safe=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    const card=document.createElement("article");
    card.className="business-card live-business-card";
    card.dataset.category=category;card.dataset.view="all";card.dataset.search=(business.name+" "+category+" "+(business.city||"")).toLowerCase();card.dataset.businessId=business.name+"-"+key;
    const reward=question.reward_type==="percentage"?Number(question.reward_value)+"% OFF":"₹"+Number(question.reward_value).toLocaleString("en-IN")+" OFF";
    card.innerHTML='<div class="card-image live-image"><span class="category-tag">'+safe(category.toUpperCase())+'</span><span class="distance">'+safe(business.city||"Local offer")+'</span><div class="image-emoji">✦</div></div><div class="card-content"><div class="business-title"><div><h3>'+safe(business.name)+'</h3><p>Verified offer from a participating business</p></div></div><div class="offer-line"><strong>'+safe(reward)+'</strong><span>'+(question.reward_type==="percentage"?"discount":"savings")+'</span></div><div class="question-line"><span>✦</span> Answer a question to unlock</div><button class="btn btn-card quiz-trigger" data-question-id="'+safe(key)+'">Answer &amp; unlock <span>→</span></button></div>';
    businessGrid.appendChild(card);
  });
  renderCards();
}

function renderCards(){
  let visible=0;
  document.querySelectorAll(".business-card").forEach(card=>{
    const categoryMatch=activeCategory==="All"||card.dataset.category===activeCategory;
    const viewMatch=activeView==="all"||card.dataset.view==="nearby";
    const term=searchInput.value.trim().toLowerCase();
    const searchMatch=!term||card.dataset.search.includes(term);
    const show=categoryMatch&&viewMatch&&searchMatch;
    card.hidden=!show;if(show)visible++;
  });
  emptyState.hidden=visible!==0;
}
document.getElementById("filters").addEventListener("click",e=>{
  const button=e.target.closest(".filter");if(!button)return;
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===button));
  activeCategory=button.dataset.category;renderCards();
});
document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  document.querySelectorAll(".tab").forEach(b=>{const active=b===button;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
  renderCards();
}));
searchInput.addEventListener("input",renderCards);
businessGrid.addEventListener("click",e=>{
  const button=e.target.closest(".quiz-trigger");if(!button)return;
  if(button.dataset.questionId){
    activeQuiz=liveQuestions.get(button.dataset.questionId);
    if(!activeQuiz)return;
  }else{
    activeQuiz=quizData[button.dataset.quiz];
    if(!activeQuiz)return;
  }
  selectedAnswer=null;
  document.getElementById("modalBusiness").textContent=activeQuiz.business;
  document.getElementById("quizQuestion").textContent=activeQuiz.question;
  document.getElementById("answerOptions").innerHTML=activeQuiz.answers.map((answer,index)=>'<label class="answer-option"><input type="radio" name="quizAnswer" value="'+index+'"><span>'+answer+'</span></label>').join("");
  document.getElementById("quizFeedback").textContent="";
  document.getElementById("quizFeedback").className="quiz-feedback";
  document.getElementById("submitAnswer").disabled=false;
  quizModal.showModal();
});
document.getElementById("answerOptions").addEventListener("change",e=>{if(e.target.name==="quizAnswer")selectedAnswer=Number(e.target.value)});
document.getElementById("submitAnswer").addEventListener("click",async()=>{
  const feedback=document.getElementById("quizFeedback");
  const submit=document.getElementById("submitAnswer");
  if(selectedAnswer===null){feedback.textContent="Choose an answer first.";feedback.className="quiz-feedback error";return;}
  if(activeQuiz.questionId){
    if(!currentSession){
      quizModal.close();openAccount("customer");
      accountFeedback.textContent="Sign in to submit your answer and receive your coupon.";
      return;
    }
    submit.disabled=true;feedback.className="quiz-feedback";feedback.textContent="Checking your answer…";
    try{
      const answer=activeQuiz.answers[selectedAnswer];
      const {data,error}=await supabase.rpc("submit_answer",{p_question_id:activeQuiz.questionId,p_answer:answer});
      if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;
      if(result?.is_correct){
        feedback.className="quiz-feedback success";
        feedback.textContent="Correct! Your coupon "+result.coupon_code+" is ready. Valid until "+new Date(result.coupon_valid_until).toLocaleString("en-IN")+". It is saved in My account.";
        if(currentSession)await loadDashboardData(currentSession);
      }else{
        feedback.className="quiz-feedback error";feedback.textContent=result?.message||"That answer is not correct. Please try again.";
        submit.disabled=false;
      }
    }catch(error){
      feedback.className="quiz-feedback error";feedback.textContent=error.message||"We could not check your answer. Please try again.";submit.disabled=false;
    }
    return;
  }
  if(selectedAnswer===activeQuiz.correct){
    feedback.textContent="This is a preview question. Live coupons are issued only for questions published by approved businesses.";
    feedback.className="quiz-feedback success";submit.disabled=true;
  }else{
    feedback.textContent="Not quite. Please try again.";feedback.className="quiz-feedback error";
  }
});
document.getElementById("closeModal").addEventListener("click",()=>quizModal.close());

function showInfo(title,text){document.getElementById("infoTitle").textContent=title;document.getElementById("infoText").textContent=text;infoModal.showModal()}
document.getElementById("closeInfo").addEventListener("click",()=>infoModal.close());
document.getElementById("infoOk").addEventListener("click",()=>infoModal.close());

const accountForm=document.getElementById("accountForm");
const accountMode=document.getElementById("accountMode");
const accountRole=document.getElementById("accountRole");
const nameField=document.getElementById("nameField");
const businessFields=document.getElementById("businessFields");
const accountFeedback=document.getElementById("accountFeedback");
const accountSubmit=document.getElementById("accountSubmit");

function updateAccountForm(){
  const signup=accountMode.value==="signup";
  nameField.hidden=!signup;
  businessFields.hidden=!(signup&&accountRole.value==="business");
  document.getElementById("accountHeading").textContent=signup?"Create your Coupons account":"Welcome back";
  document.getElementById("accountIntro").textContent=signup?"Create an account with your email. Mobile OTP will be configured separately.":"Sign in with the email and password you registered with.";
  document.getElementById("fullName").required=signup;
  document.getElementById("businessName").required=signup&&accountRole.value==="business";
  document.getElementById("businessCategory").required=signup&&accountRole.value==="business";
  document.getElementById("accountPassword").autocomplete=signup?"new-password":"current-password";
  accountSubmit.textContent=signup?"Create account":"Sign in";
  accountFeedback.textContent="";
}
accountMode.addEventListener("change",updateAccountForm);
accountRole.addEventListener("change",updateAccountForm);

function openAccount(role="customer"){
  accountRole.value=role;
  accountMode.value="signin";
  updateAccountForm();
  accountModal.showModal();
}
document.getElementById("customerLogin").addEventListener("click",()=>currentSession?showCustomerDashboard(currentSession):openAccount("customer"));
document.getElementById("businessLogin").addEventListener("click",()=>openAccount("business"));
document.getElementById("businessCta").addEventListener("click",()=>openAccount("business"));
document.getElementById("closeAccount").addEventListener("click",()=>accountModal.close());

document.getElementById("resendConfirmation").addEventListener("click",async()=>{
  const email=document.getElementById("accountEmail").value.trim();
  if(!email){accountFeedback.className="account-feedback error";accountFeedback.textContent="Enter your email address first.";return}
  const resendButton=document.getElementById("resendConfirmation");
  resendButton.disabled=true;
  accountFeedback.className="account-feedback";
  accountFeedback.textContent="Sending a fresh confirmation email…";
  try{
    const {error}=await supabase.auth.resend({
      type:"signup",
      email,
      options:{emailRedirectTo:"https://sanjeev2206.github.io/Coupons/"}
    });
    if(error)throw error;
    accountFeedback.className="account-feedback success";
    accountFeedback.textContent="A new confirmation email has been requested. Use only the newest email and ignore older confirmation links.";
  }catch(error){
    accountFeedback.className="account-feedback error";
    accountFeedback.textContent=error.message||"Could not resend the confirmation email. Check the email address and try again.";
  }finally{
    resendButton.disabled=false;
  }
});

accountForm.addEventListener("submit",async event=>{
  event.preventDefault();
  accountSubmit.disabled=true;
  accountFeedback.className="account-feedback";
  accountFeedback.textContent="Please wait…";
  const email=document.getElementById("accountEmail").value.trim();
  const password=document.getElementById("accountPassword").value;
  const signup=accountMode.value==="signup";
  const role=accountRole.value;
  try{
    let authResult;
    if(signup){
      authResult=await supabase.auth.signUp({
        email,password,
        options:{data:{full_name:document.getElementById("fullName").value.trim()},emailRedirectTo:"https://sanjeev2206.github.io/Coupons/"}
      });
    }else{
      authResult=await supabase.auth.signInWithPassword({email,password});
    }
    if(authResult.error)throw authResult.error;
    if(signup&&!authResult.data.session){
      accountFeedback.className="account-feedback success";
      accountFeedback.textContent="Account request received. Check your email for a confirmation link, then return here and sign in. For business registration, choose Business owner when signing in.";
      return;
    }
    if(role==="business"){
      if(signup){
        const businessName=document.getElementById("businessName").value.trim();
        const businessCategory=document.getElementById("businessCategory").value;
        if(!businessName||!businessCategory)throw new Error("Enter your business name and choose a category.");
        const {data:businessId,error}=await supabase.rpc("register_business",{
          p_name:businessName,p_category:businessCategory,p_description:null,
          p_phone:document.getElementById("businessPhone").value.trim()||null,
          p_email:email,p_address:document.getElementById("businessAddress").value.trim()||null,
          p_city:document.getElementById("businessCity").value.trim()||null,
          p_state:null,p_postal_code:null,p_latitude:null,p_longitude:null
        });
        if(error)throw error;
        accountFeedback.className="account-feedback success";
        accountFeedback.textContent="Business application submitted (ID: "+businessId+"). Sign in with this email and password to view its status.";
      }else{
        currentSession=authResult.data.session;
        await showBusinessDashboard(currentSession);
        accountModal.close();
      }
    }else{
      accountFeedback.className="account-feedback success";
      accountFeedback.textContent=signup?"Your customer account has been created.":"You're signed in successfully.";
      if(authResult.data.session){currentSession=authResult.data.session;accountModal.close();await showCustomerDashboard(currentSession);}
    }
  }catch(error){
    accountFeedback.className="account-feedback error";
    accountFeedback.textContent=error.message||"Something went wrong. Please try again.";
  }finally{
    accountSubmit.disabled=false;
  }
});

document.getElementById("locationButton").addEventListener("click",()=>{
  const message=document.getElementById("locationMessage");
  if(!("geolocation" in navigator)){message.textContent="Your browser does not support location sharing. You can still browse all offers.";return}
  message.textContent="Nearby search will use your location after live business discovery is connected.";
});
document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".main-nav").classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(link=>link.addEventListener("click",()=>document.querySelector(".main-nav").classList.remove("open")));
renderCards();



let currentBusiness=null;
async function showBusinessDashboard(session){
  currentSession=session;
  dashboard.hidden=true;
  document.getElementById("businessDashboard").hidden=false;
  ["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=true;});
  document.getElementById("customerLogin").textContent="Business dashboard";
  document.getElementById("businessWelcome").textContent="Welcome, "+(session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"business owner")+".";
  const {data:businesses,error}=await supabase.from("businesses").select("id,name,status,category,city").eq("owner_id",session.user.id).order("created_at",{ascending:false}).limit(1);
  if(error)throw error;
  currentBusiness=businesses?.[0]||null;
  if(!currentBusiness){
    document.getElementById("businessStatus").textContent="No business application is linked to this account.";
    document.getElementById("businessPending").hidden=false;
    document.getElementById("businessPending").innerHTML="<h2>No business application found</h2><p>Please sign out and register using the Business owner account type.</p>";
    document.getElementById("businessTools").hidden=true;
    return;
  }
  document.getElementById("businessStatus").textContent=currentBusiness.name+" · "+currentBusiness.category+(currentBusiness.city?" · "+currentBusiness.city:"");
  const approved=currentBusiness.status==="approved";
  document.getElementById("businessPending").hidden=approved;
  document.getElementById("businessTools").hidden=!approved;
  if(!approved){
    document.getElementById("businessPending").innerHTML="<h2>Application "+safeText(currentBusiness.status||"pending")+"</h2><p>Your business application for <strong>"+safeText(currentBusiness.name)+"</strong> is saved. An administrator must approve it before you can publish questions or redeem coupons.</p>";
  }else{
    await loadBusinessQuestions();
  }
}
async function loadBusinessQuestions(){
  if(!currentBusiness)return;
  const box=document.getElementById("businessQuestionList");box.textContent="Loading offers…";
  const {data,error}=await supabase.from("questions").select("id,prompt,status,reward_type,reward_value,issued_count,max_coupons,ends_at").eq("business_id",currentBusiness.id).order("created_at",{ascending:false});
  if(error){box.textContent="Could not load offers: "+error.message;return;}
  if(!data?.length){box.innerHTML="<p class='dashboard-muted'>You have not published a question yet.</p>";return;}
  box.innerHTML=data.map(q=>"<article class='coupon-row'><div><strong>"+safeText(q.prompt)+"</strong><p>"+(q.reward_type==="percentage"?safeText(q.reward_value)+"% off":"₹"+safeText(q.reward_value)+" off")+" · "+safeText(q.status)+"</p></div><div class='coupon-meta'><span>"+q.issued_count+" / "+q.max_coupons+" claimed</span><span>Ends "+new Date(q.ends_at).toLocaleDateString("en-IN")+"</span></div></article>").join("");
}
document.getElementById("businessQuestionForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!currentBusiness)return;
  const button=document.getElementById("publishQuestion"),feedback=document.getElementById("businessQuestionFeedback");
  const options=document.getElementById("businessOptions").value.split("\n").map(x=>x.trim()).filter(Boolean);
  const endValue=document.getElementById("businessEndDate").value;
  if(options.length<2||options.length>6){feedback.textContent="Enter between 2 and 6 answer options.";feedback.className="account-feedback error";return;}
  if(!endValue||new Date(endValue)<=new Date()){feedback.textContent="Choose a future end date and time.";feedback.className="account-feedback error";return;}
  button.disabled=true;feedback.textContent="Publishing…";
  try{
    const {data,error}=await supabase.rpc("create_question",{p_business_id:currentBusiness.id,p_prompt:document.getElementById("businessPrompt").value.trim(),p_options:options,p_correct_answer:document.getElementById("businessCorrect").value.trim(),p_reward_type:document.getElementById("businessRewardType").value,p_reward_value:Number(document.getElementById("businessRewardValue").value),p_minimum_purchase:Number(document.getElementById("businessMinimum").value||0),p_max_coupons:Number(document.getElementById("businessMaxCoupons").value),p_starts_at:new Date().toISOString(),p_ends_at:new Date(endValue).toISOString(),p_coupon_validity_days:Number(document.getElementById("businessValidity").value),p_terms:document.getElementById("businessTerms").value.trim()||null});
    if(error)throw error;
    feedback.className="account-feedback success";feedback.textContent="Question published successfully. ID: "+data;
    e.target.reset();document.getElementById("businessMinimum").value="0";document.getElementById("businessMaxCoupons").value="100";document.getElementById("businessValidity").value="7";
    await loadBusinessQuestions();await loadLiveOffers();
  }catch(error){feedback.className="account-feedback error";feedback.textContent=error.message||"Could not publish question.";}
  finally{button.disabled=false;}
});
document.getElementById("businessRedeemForm").addEventListener("submit",async e=>{
  e.preventDefault();const button=e.target.querySelector("button[type=submit]"),feedback=document.getElementById("redeemFeedback");
  button.disabled=true;feedback.textContent="Checking coupon…";
  try{
    const {data,error}=await supabase.rpc("redeem_coupon",{p_code:document.getElementById("redeemCode").value.trim()});
    if(error)throw error;const result=Array.isArray(data)?data[0]:data;
    feedback.className="account-feedback "+(result?.success?"success":"error");feedback.textContent=result?.message||"Could not redeem coupon.";
    if(result?.success)e.target.reset();
  }catch(error){feedback.className="account-feedback error";feedback.textContent=error.message||"Could not redeem coupon.";}
  finally{button.disabled=false;}
});
document.getElementById("businessSignOut").addEventListener("click",async()=>{
  const {error}=await supabase.auth.signOut();if(error){alert(error.message);return;}
  currentSession=null;currentBusiness=null;document.getElementById("businessDashboard").hidden=true;
  ["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});
  document.getElementById("customerLogin").textContent="Sign in";window.scrollTo({top:0,behavior:"smooth"});
});

async function showCustomerDashboard(session){
 if(!session)return; currentSession=session; dashboard.hidden=false;
 ["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=true;});
 document.getElementById("customerLogin").textContent="My account";
 document.getElementById("dashboardName").textContent=(session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"there").split(" ")[0];
 document.getElementById("profileEmail").value=session.user.email||"";
 await loadDashboardData(session);window.scrollTo({top:0,behavior:"smooth"});
}
function safeText(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
async function loadDashboardData(session){
 const list=document.getElementById("couponList");list.textContent="Loading your coupons…";
 const results=await Promise.all([supabase.from("profiles").select("full_name,phone,role").eq("id",session.user.id).maybeSingle(),supabase.from("coupons").select("id,code,reward_type,reward_value,minimum_purchase,issued_at,valid_until,status,businesses(name)").eq("customer_id",session.user.id).order("issued_at",{ascending:false})]);
 const pr=results[0],cr=results[1],feedback=document.getElementById("profileFeedback");
 if(pr.error)feedback.textContent="Profile could not load: "+pr.error.message;else{const p=pr.data||{};document.getElementById("profileName").value=p.full_name||session.user.user_metadata?.full_name||"";document.getElementById("profilePhone").value=p.phone||"";if(p.full_name)document.getElementById("dashboardName").textContent=p.full_name.split(" ")[0];}
 if(cr.error){list.textContent="Could not load coupons: "+cr.error.message;return;}
 const coupons=cr.data||[],now=Date.now(),active=coupons.filter(x=>x.status==="active"&&new Date(x.valid_until).getTime()>now),redeemed=coupons.filter(x=>x.status==="redeemed"),expired=coupons.filter(x=>x.status==="expired"||(x.status==="active"&&new Date(x.valid_until).getTime()<=now));
 document.getElementById("availableCount").textContent=active.length;document.getElementById("redeemedCount").textContent=redeemed.length;document.getElementById("expiredCount").textContent=expired.length;
 if(!coupons.length){list.innerHTML="<div class='coupon-empty'><h3>Your rewards will appear here</h3><p>You have not unlocked a coupon yet. Explore businesses and answer a question to earn your first reward.</p></div>";return;}
 list.innerHTML=coupons.map(x=>{const exp=x.status==="expired"||(x.status==="active"&&new Date(x.valid_until).getTime()<=now),status=exp?"Expired":x.status==="redeemed"?"Redeemed":x.status==="cancelled"?"Cancelled":"Available",reward=x.reward_type==="percentage"?Number(x.reward_value)+"% off":"₹"+Number(x.reward_value).toLocaleString("en-IN")+" off",business=x.businesses?.name||"Participating business";return "<article class='coupon-row'><div class='coupon-reward'><strong>"+safeText(reward)+"</strong><span>"+safeText(business)+"</span></div><div class='coupon-code'><span>COUPON CODE</span><strong>"+safeText(x.code)+"</strong></div><div class='coupon-meta'><span class='coupon-status "+(exp?"expired":x.status==="redeemed"?"redeemed":"available")+"'>"+status+"</span><span>Valid until "+new Date(x.valid_until).toLocaleDateString("en-IN")+"</span></div></article>";}).join("");
}
document.getElementById("refreshCoupons").addEventListener("click",()=>currentSession&&loadDashboardData(currentSession));
document.getElementById("profileForm").addEventListener("submit",async e=>{e.preventDefault();const b=document.getElementById("saveProfile"),f=document.getElementById("profileFeedback");b.disabled=true;f.textContent="Saving…";try{const {error}=await supabase.rpc("update_my_profile",{p_full_name:document.getElementById("profileName").value.trim()});if(error)throw error;document.getElementById("dashboardName").textContent=document.getElementById("profileName").value.trim().split(" ")[0]||"there";f.className="account-feedback success";f.textContent="Your name has been updated.";}catch(error){f.className="account-feedback error";f.textContent=error.message||"Could not update profile.";}finally{b.disabled=false;}});
document.getElementById("dashboardSignOut").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error){alert(error.message);return;}currentSession=null;dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});document.getElementById("customerLogin").textContent="Sign in";window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("dashboardDiscover").addEventListener("click",()=>{dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});});
await loadLiveOffers();
const {data:{session}}=await supabase.auth.getSession();if(session){const {data:profile}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(profile?.role==="business")await showBusinessDashboard(session);else await showCustomerDashboard(session);}
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){currentSession=null;currentBusiness=null;document.getElementById("businessDashboard").hidden=true;dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});document.getElementById("customerLogin").textContent="Sign in";}});

